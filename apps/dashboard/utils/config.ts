function validateEnv<T extends string = string>(key: keyof NodeJS.ProcessEnv, defaultValue?: T): T {
  const value = process.env[key] as T | undefined;

  if (!value) {
    if (typeof defaultValue !== 'undefined') {
      return defaultValue;
    } else if (!process.browser) {
      throw new Error(`${key} is not defined in environment variables`);
    }
  }

  return value;
}

export const config = {
  cookieName: 'token',
  discordBotToken: validateEnv('DISCORD_BOT_TOKEN'),
  discordAppId: validateEnv('DISCORD_APP_ID'),
  clientId: validateEnv('CLIENT_ID'),
  clientSecret: validateEnv('CLIENT_SECRET'),
  patreonClientId: validateEnv('PATREON_CLIENT_ID'),
  patreonClientSecret: validateEnv('PATREON_CLIENT_SECRET'),
  patreonWebhookSecret: validateEnv('PATREON_WEBHOOK_SECRET'),
  patreonTierMap: validateEnv('PATREON_TIER_MAP', '{}'),
  googleClientId: validateEnv('GOOGLE_CLIENT_ID'),
  googleClientSecret: validateEnv('GOOGLE_CLIENT_SECRET'),
  microsoftClientId: validateEnv('MICROSOFT_CLIENT_ID'),
  microsoftClientSecret: validateEnv('MICROSOFT_CLIENT_SECRET'),
  dropboxClientId: validateEnv('DROPBOX_CLIENT_ID'),
  dropboxClientSecret: validateEnv('DROPBOX_CLIENT_SECRET'),
  appUri: validateEnv('APP_URI', 'http://localhost:3000'),
  downloadBaseUri: validateEnv('API_HOMEPAGE', 'http://localhost:5029/').replace(/\/$/, ''),
  jwtSecret: validateEnv('JWT_SECRET', 'this is a development value that should be changed in production!!!!!'),
  cookieSecure: validateEnv('COOKIE_SECURE', 'true') === 'true',
  aiBudgetMonthlyCapUsd: Number(validateEnv('AI_BUDGET_MONTHLY_CAP_USD', '15')),
  aiBillingOverrideUserIds: validateEnv('AI_BILLING_OVERRIDE_USER_IDS', ''),
  stripeSecretKey: validateEnv('STRIPE_SECRET_KEY', ''),
  stripePublishableKey: validateEnv('STRIPE_PUBLISHABLE_KEY', ''),
  stripeWebhookSecret: validateEnv('STRIPE_WEBHOOK_SECRET', ''),
  stripeMeteredPriceId: validateEnv('STRIPE_METERED_PRICE_ID', ''),
  stripeBillingReturnUrl: validateEnv('STRIPE_BILLING_RETURN_URL', 'http://localhost:3000/billing'),
  stripeCustomerPortalConfigurationId: validateEnv('STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID', '')
} as const;
