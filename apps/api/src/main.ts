import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: (errors) => {
        console.error('Validation errors:', JSON.stringify(errors, null, 2));
        const messages = errors.map((error) => Object.values(error.constraints || {})).flat();
        return new (require('@nestjs/common').BadRequestException)(messages);
      },
    })
  );
  await app.listen(process.env.PORT ?? 3005);
}
bootstrap();
