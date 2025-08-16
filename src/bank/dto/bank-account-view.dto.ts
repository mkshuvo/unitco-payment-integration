export interface BankAccountView {
  accountId: number;
  bankName: string;
  mask: string; // ****1234
  method: 'ACH' | 'WIRE';
  country: string;
  isPrimary: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  unitCounterpartyStatus: 'PENDING' | 'ACTIVE' | 'REJECTED';
  createdTime: number;
}
