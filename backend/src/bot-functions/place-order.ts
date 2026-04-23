import { orderService } from '../features/orders/order.service';
import { PlaceOrderInput, PlaceOrderResult } from '../features/orders/order.types';

export const placeOrderFunction = {
  type: 'function' as const,
  function: {
    name: 'place_order',
    description: 'Create the final order after the user confirms all details. Requires `deliveryAddress` and `paymentMethod`. The widget will attach the current local cart automatically.',
    parameters: {
      type: 'object' as const,
      properties: {
        customerName: {
          type: 'string' as const,
          description: 'Customer name for the order.'
        },
        customerPhone: {
          type: 'string' as const,
          description: 'Customer phone number.'
        },
        deliveryAddress: {
          type: 'string' as const,
          description: 'Full delivery address confirmed by the user.'
        },
        paymentMethod: {
          type: 'string' as const,
          description: 'Payment method: `cash` or `card`.'
        },
        comment: {
          type: 'string' as const,
          description: 'Optional customer comment for the order.'
        }
      },
      required: ['deliveryAddress', 'paymentMethod'] as const
    }
  }
};

interface RuntimePlaceOrderInput extends Omit<PlaceOrderInput, 'cart'> {
  cart?: PlaceOrderInput['cart'];
}

export async function placeOrder(
  args: RuntimePlaceOrderInput
): Promise<PlaceOrderResult> {
  if (!args.cart) {
    return {
      success: false,
      response: 'Cart data was not attached to the order request.',
      error: 'CART_NOT_ATTACHED'
    };
  }

  return orderService.placeOrder({
    cart: args.cart,
    comment: args.comment,
    customerName: args.customerName,
    customerPhone: args.customerPhone,
    deliveryAddress: args.deliveryAddress,
    hostname: args.hostname,
    paymentMethod: args.paymentMethod
  });
}
