import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { MailModule } from "../mail/mail.module";
import { ReminderService } from "./reminder.service";

@Module({
  imports: [ScheduleModule.forRoot(), MailModule],
  providers: [ReminderService],
})
export class SchedulerModule {}
