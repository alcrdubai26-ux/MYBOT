import { DAVClient, createDAVClient } from 'tsdav';

interface CalendarEvent {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  raw?: string;
}

interface CreateEventParams {
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
}

class AppleCalendarService {
  private client: DAVClient | null = null;
  private initialized = false;

  isConfigured(): boolean {
    return !!(process.env.APPLE_CALDAV_USER && process.env.APPLE_CALDAV_PASS);
  }

  async initialize(): Promise<boolean> {
    if (this.initialized && this.client) {
      return true;
    }

    if (!this.isConfigured()) {
      console.log('[Calendar] No configurado - faltan APPLE_CALDAV_USER y APPLE_CALDAV_PASS');
      return false;
    }

    try {
      // Try different iCloud CalDAV endpoints
      const username = process.env.APPLE_CALDAV_USER!.trim();
      const password = process.env.APPLE_CALDAV_PASS!.trim().replace(/-/g, '');
      
      console.log(`[Calendar] Intentando conectar con usuario: ${username.substring(0, 3)}...`);
      
      this.client = await createDAVClient({
        serverUrl: 'https://caldav.icloud.com',
        credentials: {
          username,
          password,
        },
        authMethod: 'Basic',
        defaultAccountType: 'caldav',
      });
      
      this.initialized = true;
      console.log('[Calendar] Conectado a iCloud Calendar');
      return true;
    } catch (err) {
      console.error('[Calendar] Error conectando:', err);
      return false;
    }
  }

  async getCalendars(): Promise<any[]> {
    if (!this.client) {
      throw new Error('Calendario no inicializado');
    }
    return await this.client.fetchCalendars();
  }

  async getEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    if (!this.client) {
      throw new Error('Calendario no inicializado');
    }

    const calendars = await this.client.fetchCalendars();
    const events: CalendarEvent[] = [];

    for (const calendar of calendars) {
      try {
        const calEvents = await this.client.fetchCalendarObjects({
          calendar,
          timeRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
        });

        for (const event of calEvents) {
          const parsed = this.parseICS(event.data);
          if (parsed) {
            events.push(parsed);
          }
        }
      } catch (err) {
        console.error(`[Calendar] Error obteniendo eventos de ${calendar.displayName}:`, err);
      }
    }

    return events.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  private parseICS(icsData: string): CalendarEvent | null {
    try {
      const lines = icsData.split('\n').map(l => l.trim());
      
      let uid = '';
      let title = '';
      let start: Date | null = null;
      let end: Date | null = null;
      let description = '';
      let location = '';

      for (const line of lines) {
        if (line.startsWith('UID:')) {
          uid = line.substring(4);
        } else if (line.startsWith('SUMMARY:')) {
          title = line.substring(8);
        } else if (line.startsWith('DTSTART')) {
          start = this.parseICSDate(line);
        } else if (line.startsWith('DTEND')) {
          end = this.parseICSDate(line);
        } else if (line.startsWith('DESCRIPTION:')) {
          description = line.substring(12);
        } else if (line.startsWith('LOCATION:')) {
          location = line.substring(9);
        }
      }

      if (!start || !title) {
        return null;
      }

      return {
        uid,
        title,
        start,
        end: end || new Date(start.getTime() + 3600000),
        description,
        location,
        raw: icsData,
      };
    } catch {
      return null;
    }
  }

  private parseICSDate(line: string): Date | null {
    try {
      const match = line.match(/(\d{8}T?\d{0,6}Z?)/);
      if (!match) return null;

      const dateStr = match[1];
      
      if (dateStr.length === 8) {
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        return new Date(year, month, day);
      }

      if (dateStr.length >= 15) {
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        const hour = parseInt(dateStr.substring(9, 11));
        const minute = parseInt(dateStr.substring(11, 13));
        const second = parseInt(dateStr.substring(13, 15));
        
        if (dateStr.endsWith('Z')) {
          return new Date(Date.UTC(year, month, day, hour, minute, second));
        }
        return new Date(year, month, day, hour, minute, second);
      }

      return null;
    } catch {
      return null;
    }
  }

  async getTodayEvents(): Promise<CalendarEvent[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this.getEvents(today, tomorrow);
  }

  async getWeekEvents(): Promise<CalendarEvent[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    return this.getEvents(today, nextWeek);
  }

  async getEventsForDate(date: Date): Promise<CalendarEvent[]> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    
    return this.getEvents(start, end);
  }

  async getEventsForDateRange(startDate: string, endDate: string): Promise<CalendarEvent[]> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return this.getEvents(start, end);
  }

  async createEvent(params: CreateEventParams): Promise<{ success: boolean; uid: string }> {
    if (!this.client) {
      throw new Error('Calendario no inicializado');
    }

    const calendars = await this.client.fetchCalendars();
    const mainCalendar = calendars[0];

    if (!mainCalendar) {
      throw new Error('No se encontró ningún calendario');
    }

    const uid = `amun-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const formatDate = (d: Date): string => {
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsEvent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AMUN//OpenClaw//ES
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(params.start)}
DTEND:${formatDate(params.end)}
SUMMARY:${params.title}
DESCRIPTION:${params.description || ''}
LOCATION:${params.location || ''}
END:VEVENT
END:VCALENDAR`;

    await this.client.createCalendarObject({
      calendar: mainCalendar,
      filename: `${uid}.ics`,
      iCalString: icsEvent,
    });

    return { success: true, uid };
  }

  formatEventForDisplay(event: CalendarEvent): string {
    const timeFormat = new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const time = timeFormat.format(event.start);
    let result = `- ${time} ${event.title}`;
    
    if (event.location) {
      result += ` (${event.location})`;
    }

    return result;
  }

  formatEventsForDisplay(events: CalendarEvent[]): string {
    if (events.length === 0) {
      return "No hay eventos programados.";
    }

    return events.map(e => this.formatEventForDisplay(e)).join('\n');
  }
}

export const appleCalendarService = new AppleCalendarService();
