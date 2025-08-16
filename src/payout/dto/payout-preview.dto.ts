export interface PayoutPreviewDto {
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  itemCount: number;
  currency: string;
  estimatedDeliveryDate: Date;
  bankAccount: {
    accountId: number;
    bankName: string;
    mask: string;
    method: 'ACH' | 'WIRE';
  };
}
