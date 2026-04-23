export type PlaceOrderPaymentMethod = 'cash' | 'card';

export interface PlaceOrderCartItemInput {
  quantity: number;
  variantId: number;
}

export interface PlaceOrderCartInput {
  items: PlaceOrderCartItemInput[];
  totalAmount?: number;
  totalItems?: number;
}

export interface PlaceOrderInput {
  cart: PlaceOrderCartInput;
  comment?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress: string;
  hostname: string;
  paymentMethod: PlaceOrderPaymentMethod;
}

export interface PlaceOrderSuccess {
  success: true;
  response: string;
  order: {
    comment?: string;
    createdAt: string;
    customerName?: string;
    customerPhone?: string;
    deliveryAddress: string;
    id: string;
    items: Array<{
      productTitle: string;
      quantity: number;
      sku?: string;
      totalPrice: number;
      unitPrice: number;
      variantId: number;
      variantTitle: string;
    }>;
    paymentMethod: PlaceOrderPaymentMethod;
    totalAmount: number;
    totalItems: number;
  };
}

export interface PlaceOrderFailure {
  success: false;
  response: string;
  error: string;
}

export type PlaceOrderResult = PlaceOrderSuccess | PlaceOrderFailure;
