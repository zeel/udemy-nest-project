import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieSession from 'cookie-session';

/**
 * Request-pipeline setup shared by the real bootstrap and the e2e tests, so
 * the two cannot drift apart. main.ts is not executed by Nest's testing
 * harness, so anything configured only there would be missing under test.
 */
export function setupApp(app: INestApplication) {
  const config = app.get(ConfigService);

  app.use(
    cookieSession({
      keys: [config.getOrThrow<string>('COOKIE_KEY')],
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );
}
