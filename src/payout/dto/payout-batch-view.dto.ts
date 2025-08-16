export interface PayoutBatchView {
  batchId: number;
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  itemCount: number;
  currency: string;
  status: 'PENDING' | 'SUBMITTED' | 'COMPLETED' | 'FAILED';
  estimatedDeliveryDate: Date;
  createdAt: number;
}
