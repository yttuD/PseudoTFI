import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { assertApiReleaseConfiguration, parseAllowedWebOrigins } from './config/release-readiness.js';

async function bootstrap() {
  assertApiReleaseConfiguration();
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: parseAllowedWebOrigins() });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: (errors) => {
        console.error('Validation errors:', JSON.stringify(errors, null, 2));
        const messages = errors.map((error) => Object.values(error.constraints || {})).flat();
        return new BadRequestException(messages);
      },
    })
  );
  await app.listen(process.env.PORT ?? 3005);
}
bootstrap();
