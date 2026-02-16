import { IsNotEmpty, IsNumber, IsOptional, IsString, IsEnum, IsISO8601 } from 'class-validator';

export class CreateInspectionDto {
    @IsNotEmpty()
    @IsNumber()
    assetId: number;

    @IsNotEmpty()
    @IsISO8601()
    scheduledDate: string;

    @IsOptional()
    @IsString()
    type?: string;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsISO8601()
    completedDate?: string;

    @IsOptional()
    @IsString()
    result?: string;

    @IsOptional()
    @IsNumber()
    durationSeconds?: number;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    checklistData?: any;
}

