import { Test, TestingModule } from '@nestjs/testing';
import { ChekclistItemService } from '../../resources/chekclist-item/chekclist-item.service';
import { CreateChekclistItemDto } from '../../resources/chekclist-item/dto/create-chekclist-item.dto';
import { UpdateChekclistItemDto } from '../../resources/chekclist-item/dto/update-chekclist-item.dto';

describe('ChekclistItemService', () => {
  let service: ChekclistItemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChekclistItemService],
    }).compile();

    service = module.get<ChekclistItemService>(ChekclistItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should return a placeholder message', () => {
      const createChekclistItemDto: CreateChekclistItemDto = {
        title: 'Préparer la décoration',
        reservationId: 'reservation-1',
        assignedTo: 'user-1',
        dueAt: new Date(),
      };

      const result = service.create(createChekclistItemDto);

      expect(result).toBe('This action adds a new chekclistItem');
    });
  });

  describe('findAll', () => {
    it('should return a placeholder message', () => {
      const result = service.findAll();

      expect(result).toBe('This action returns all chekclistItem');
    });
  });

  describe('findOne', () => {
    it('should return a placeholder message with id', () => {
      const id = 1;
      const result = service.findOne(id);

      expect(result).toBe('This action returns a #1 chekclistItem');
    });
  });

  describe('update', () => {
    it('should return a placeholder message', () => {
      const id = 1;
      const updateChekclistItemDto: UpdateChekclistItemDto = {
        title: 'Décoration mise à jour',
        completed: true,
      };

      const result = service.update(id, updateChekclistItemDto);

      expect(result).toBe('This action updates a #1 chekclistItem');
    });
  });

  describe('remove', () => {
    it('should return a placeholder message', () => {
      const id = 1;
      const result = service.remove(id);

      expect(result).toBe('This action removes a #1 chekclistItem');
    });
  });
});
