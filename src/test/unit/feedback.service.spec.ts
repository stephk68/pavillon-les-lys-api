import { Test, TestingModule } from '@nestjs/testing';
import { CreateFeedbackDto } from '../../resources/feedback/dto/create-feedback.dto';
import { UpdateFeedbackDto } from '../../resources/feedback/dto/update-feedback.dto';
import { FeedbackService } from '../../resources/feedback/feedback.service';

describe('FeedbackService', () => {
  let service: FeedbackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FeedbackService],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should return a placeholder message', () => {
      const createFeedbackDto: CreateFeedbackDto = {
        rating: 5,
        comment: 'Excellent service!',
        userId: 'user-1',
        reservationId: 'reservation-1',
      };

      const result = service.create(createFeedbackDto);

      expect(result).toBe('This action adds a new feedback');
    });
  });

  describe('findAll', () => {
    it('should return a placeholder message', () => {
      const result = service.findAll();

      expect(result).toBe('This action returns all feedback');
    });
  });

  describe('findOne', () => {
    it('should return a placeholder message with id', () => {
      const id = 1;
      const result = service.findOne(id);

      expect(result).toBe('This action returns a #1 feedback');
    });
  });

  describe('update', () => {
    it('should return a placeholder message', () => {
      const id = 1;
      const updateFeedbackDto: UpdateFeedbackDto = {
        rating: 4,
        comment: 'Good service',
      };

      const result = service.update(id, updateFeedbackDto);

      expect(result).toBe('This action updates a #1 feedback');
    });
  });

  describe('remove', () => {
    it('should return a placeholder message', () => {
      const id = 1;
      const result = service.remove(id);

      expect(result).toBe('This action removes a #1 feedback');
    });
  });
});
