import { Test, TestingModule } from '@nestjs/testing';
import { AnomaliesService } from './anomalies.service';

describe('AnomaliesService', () => {
  let service: AnomaliesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnomaliesService],
    }).compile();

    service = module.get<AnomaliesService>(AnomaliesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
