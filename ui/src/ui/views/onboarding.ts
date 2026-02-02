import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state";
import { icons } from "../icons";

export type OnboardingProps = {
  state: AppViewState;
  onNext: () => void;
  onPrev: () => void;
  onComplete: (data: any) => void;
};

export function renderOnboarding(props: OnboardingProps) {
  const { state } = props;
  const step = state.onboardingStep;

  return html`
    <div class="onboarding-overlay">
      <div class="onboarding-card">
        <div class="onboarding-header">
          <div class="onboarding-steps">
            <div class="step-dot ${step >= 1 ? 'active' : ''}">1</div>
            <div class="step-line ${step >= 2 ? 'active' : ''}"></div>
            <div class="step-dot ${step >= 2 ? 'active' : ''}">2</div>
            <div class="step-line ${step >= 3 ? 'active' : ''}"></div>
            <div class="step-dot ${step >= 3 ? 'active' : ''}">3</div>
          </div>
          <h1>${getStepTitle(step)}</h1>
          <p>${getStepSub(step)}</p>
        </div>

        <div class="onboarding-body">
          ${renderStepContent(props)}
        </div>

        <div class="onboarding-footer">
          ${step > 1 ? html`
            <button class="btn" @click=${props.onPrev}>Anterior</button>
          ` : nothing}
          <div style="flex: 1"></div>
          ${step < 3 ? html`
            <button class="btn primary" @click=${props.onNext}>Continuar</button>
          ` : html`
            <button class="btn primary" @click=${() => props.onComplete({})}>Finalizar</button>
          `}
        </div>
      </div>
    </div>
  `;
}

function getStepTitle(step: number) {
  switch (step) {
    case 1: return "Bienvenido a AMUN 2.0";
    case 2: return "Conecta tus Canales";
    case 3: return "Activa tus Superpoderes";
    default: return "";
  }
}

function getStepSub(step: number) {
  switch (step) {
    case 1: return "Tu nuevo asistente inteligente personal está listo. Vamos a configurarlo en menos de 2 minutos.";
    case 2: return "Selecciona por dónde quieres hablar con AMUN.";
    case 3: return "Habilita los Skills que AMUN podrá usar para ayudarte.";
    default: return "";
  }
}

function renderStepContent(props: OnboardingProps) {
  const { state } = props;
  switch (state.onboardingStep) {
    case 1: return renderStep1();
    case 2: return renderStep2(props);
    case 3: return renderStep3(props);
    default: return nothing;
  }
}

function renderStep1() {
  return html`
    <div class="welcome-hero">
      <div class="hero-icon">🤖</div>
      <div class="hero-features">
        <div class="feature-item">
          <span class="icon">✨</span>
          <div>
            <strong>Inteligencia de Vanguardia</strong>
            <span>Acceso a Gemini 1.5 Pro, Claude 3.5 y más.</span>
          </div>
        </div>
        <div class="feature-item">
          <span class="icon">🏠</span>
          <div>
            <strong>Control Total</strong>
            <span>Gestiona tu casa, finanzas y trabajo desde un solo chat.</span>
          </div>
        </div>
        <div class="feature-item">
          <span class="icon">🔒</span>
          <div>
            <strong>Privacidad Garantizada</strong>
            <span>Tus datos son tuyos. Encriptación de nivel bancario.</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderStep2(props: OnboardingProps) {
  const channels = [
    { id: 'whatsapp', name: 'WhatsApp', icon: '📱', desc: 'Recibe notificaciones y chatea' },
    { id: 'telegram', name: 'Telegram', icon: '✈️', desc: 'Rápido y seguro' },
    { id: 'discord', name: 'Discord', icon: '🎮', desc: 'Para comunidades y trabajo' },
    { id: 'slack', name: 'Slack', icon: '💼', desc: 'Integración profesional' },
  ];

  return html`
    <div class="channel-grid">
      ${channels.map(c => html`
        <div class="channel-card ${props.state.settings.preferredChannel === c.id ? 'selected' : ''}" 
             @click=${() => props.state.applySettings({ ...props.state.settings, preferredChannel: c.id as any })}>
          <div class="channel-icon">${c.icon}</div>
          <div class="channel-info">
            <strong>${c.name}</strong>
            <span>${c.desc}</span>
          </div>
          <div class="channel-check">
            ${props.state.settings.preferredChannel === c.id ? html`✓` : ''}
          </div>
        </div>
      `)}
    </div>
  `;
}

function renderStep3(props: OnboardingProps) {
  const { state } = props;
  const categories = [
    { id: 'productivity', name: 'Productividad', icon: '📅' },
    { id: 'creativity', name: 'Creatividad', icon: '🎨' },
    { id: 'home', name: 'Smart Home', icon: '🏠' },
    { id: 'finance', name: 'Finanzas', icon: '📈' },
  ];

  const toggle = (id: string) => {
    const next = state.onboardingCategories.includes(id)
      ? state.onboardingCategories.filter(c => c !== id)
      : [...state.onboardingCategories, id];
    (state as any).onboardingCategories = next;
  };

  return html`
    <div class="skills-onboarding">
      ${categories.map(cat => html`
        <div class="skill-category-pill">
          <span class="icon">${cat.icon}</span>
          <span>${cat.name}</span>
          <label class="switch">
            <input type="checkbox" 
                   ?checked=${state.onboardingCategories.includes(cat.id)}
                   @change=${() => toggle(cat.id)}>
            <span class="slider"></span>
          </label>
        </div>
      `)}
      <p class="muted" style="text-align: center; margin-top: 20px;">
        Podrás activar más de 30 skills adicionales en los ajustes.
      </p>
    </div>
  `;
}
