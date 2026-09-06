import { Test, TestingModule } from '@nestjs/testing';
import { FavoritosController } from './favoritos.controller.js';

describe('FavoritosController', () => {
  let controller: FavoritosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FavoritosController],
    }).compile();

    controller = module.get<FavoritosController>(FavoritosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
