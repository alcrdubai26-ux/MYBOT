import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

const GENERATED_DIR = path.join(process.cwd(), "generated");

if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

export interface ExcelData {
  headers: string[];
  rows: (string | number | Date)[][];
  sheetName?: string;
}

class ExcelService {
  generateExcel(data: ExcelData[], filename?: string): string {
    const workbook = XLSX.utils.book_new();
    
    data.forEach((sheet, index) => {
      const sheetData = [sheet.headers, ...sheet.rows];
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      
      const colWidths = sheet.headers.map((h, i) => {
        const maxLen = Math.max(
          h.length,
          ...sheet.rows.map(row => String(row[i] || "").length)
        );
        return { wch: Math.min(maxLen + 2, 50) };
      });
      worksheet["!cols"] = colWidths;
      
      XLSX.utils.book_append_sheet(
        workbook, 
        worksheet, 
        sheet.sheetName || `Hoja${index + 1}`
      );
    });
    
    const outputFilename = filename || `report_${Date.now()}.xlsx`;
    const outputPath = path.join(GENERATED_DIR, outputFilename);
    
    XLSX.writeFile(workbook, outputPath);
    console.log(`[Excel] Archivo generado: ${outputPath}`);
    
    return outputPath;
  }

  generateFromJson(jsonData: any[], filename?: string, sheetName?: string): string {
    if (!jsonData || jsonData.length === 0) {
      throw new Error("No hay datos para generar el Excel");
    }

    const headers = Object.keys(jsonData[0]);
    const rows = jsonData.map(item => headers.map(h => item[h] ?? ""));

    return this.generateExcel([{
      headers,
      rows,
      sheetName: sheetName || "Datos"
    }], filename);
  }

  generateSubscriptionReport(emails: any[]): string {
    const subscriptions: any[] = [];
    
    emails.forEach(email => {
      const from = email.from || "";
      const subject = email.subject || "";
      const date = email.date || "";
      
      let service = "Desconocido";
      let type = "Otro";
      
      const fromLower = from.toLowerCase();
      const subjectLower = subject.toLowerCase();
      
      if (fromLower.includes("netflix")) { service = "Netflix"; type = "Streaming"; }
      else if (fromLower.includes("spotify")) { service = "Spotify"; type = "Música"; }
      else if (fromLower.includes("amazon") || fromLower.includes("prime")) { service = "Amazon"; type = "E-commerce"; }
      else if (fromLower.includes("apple")) { service = "Apple"; type = "Tecnología"; }
      else if (fromLower.includes("google")) { service = "Google"; type = "Tecnología"; }
      else if (fromLower.includes("microsoft") || fromLower.includes("office")) { service = "Microsoft"; type = "Software"; }
      else if (fromLower.includes("adobe")) { service = "Adobe"; type = "Software"; }
      else if (fromLower.includes("dropbox")) { service = "Dropbox"; type = "Almacenamiento"; }
      else if (fromLower.includes("github")) { service = "GitHub"; type = "Desarrollo"; }
      else if (fromLower.includes("notion")) { service = "Notion"; type = "Productividad"; }
      else if (fromLower.includes("slack")) { service = "Slack"; type = "Comunicación"; }
      else if (fromLower.includes("zoom")) { service = "Zoom"; type = "Comunicación"; }
      else if (fromLower.includes("linkedin")) { service = "LinkedIn"; type = "Red Social"; }
      else if (fromLower.includes("twitter") || fromLower.includes("x.com")) { service = "X/Twitter"; type = "Red Social"; }
      else if (fromLower.includes("newsletter") || subjectLower.includes("newsletter")) { service = from.split("@")[0] || "Newsletter"; type = "Newsletter"; }
      else {
        const match = from.match(/@([^.]+)/);
        if (match) service = match[1].charAt(0).toUpperCase() + match[1].slice(1);
      }
      
      subscriptions.push({
        "Servicio": service,
        "Categoría": type,
        "Email de origen": from,
        "Asunto": subject.substring(0, 100),
        "Fecha": date
      });
    });

    const grouped = new Map<string, any>();
    subscriptions.forEach(sub => {
      const key = sub.Servicio;
      if (!grouped.has(key)) {
        grouped.set(key, { ...sub, "Emails": 1 });
      } else {
        grouped.get(key)["Emails"]++;
      }
    });

    const summary = Array.from(grouped.values()).sort((a, b) => b.Emails - a.Emails);

    return this.generateExcel([
      {
        headers: ["Servicio", "Categoría", "Nº Emails", "Email de origen"],
        rows: summary.map(s => [s.Servicio, s.Categoría, s.Emails, s["Email de origen"]]),
        sheetName: "Resumen"
      },
      {
        headers: ["Servicio", "Categoría", "Email de origen", "Asunto", "Fecha"],
        rows: subscriptions.map(s => [s.Servicio, s.Categoría, s["Email de origen"], s.Asunto, s.Fecha]),
        sheetName: "Detalle"
      }
    ], `suscripciones_${Date.now()}.xlsx`);
  }
}

export const excelService = new ExcelService();
