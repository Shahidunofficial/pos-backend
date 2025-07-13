import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend communication
  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://pos-frontend-dr8f.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(3001);
  console.log('POS Backend server is running on http://localhost:3001');
}
bootstrap();
