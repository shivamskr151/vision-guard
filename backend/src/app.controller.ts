import { Controller, Get, Delete } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Delete('purge')
  async purgeAllData() {
    return this.appService.purgeData();
  }
}
