export interface TelegramArticle {
  id: string;
  title: string;
}

export interface TelegramAlertInput {
  status: 'COMPLETED' | 'FAILED' | string;
  summary: string;
  articles?: TelegramArticle[];
  linkMode?: 'review' | 'live';
}

export interface TelegramAlertResult {
  ok: boolean;
  error?: string;
}

export function sendTelegramAlert(input: TelegramAlertInput): Promise<TelegramAlertResult>;
