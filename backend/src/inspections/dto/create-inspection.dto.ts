export class CreateInspectionDto {
    assetId: number;
    scheduledDate: string;
    type?: string;
    status?: string;
    completedDate?: string;
    result?: string;
    durationSeconds?: number;
    notes?: string;
    checklistData?: any;
}
