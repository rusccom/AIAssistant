import { PaymentMethod, Prisma, ProductVariant } from '@prisma/client';
import prisma from '../../db/prisma';
import {
  PlaceOrderCartItemInput,
  PlaceOrderInput,
  PlaceOrderResult
} from './order.types';

type VariantWithProduct = ProductVariant & {
  product: { title: string };
};

type OrderItemDraft = {
  productId: number;
  productTitle: string;
  quantity: number;
  sku?: string | null;
  totalPrice: number;
  unitPrice: number;
  variantId: number;
  variantTitle: string;
};

type ValidationFailure = {
  error: PlaceOrderResult;
  ok: false;
};

type ValidationSuccess = {
  cartItems: PlaceOrderCartItemInput[];
  deliveryAddress: string;
  ok: true;
  paymentMethod: PaymentMethod;
};

type ValidationResult = ValidationFailure | ValidationSuccess;

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ru-RU', {
    currency: 'RUB',
    minimumFractionDigits: 0,
    style: 'currency'
  }).format(price / 100);
};

const normalizeText = (value?: string) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const normalizePaymentMethod = (value: string) => {
  return value.trim().toLowerCase() === 'cash'
    ? PaymentMethod.CASH
    : value.trim().toLowerCase() === 'card'
      ? PaymentMethod.CARD
      : null;
};

const buildError = (response: string, error: string): PlaceOrderResult => {
  return { success: false, response, error };
};

const buildOrderResponse = (
  orderId: string,
  totalItems: number,
  totalAmount: number
) => {
  return `Order ${orderId} was created for ${totalItems} item(s) totaling ${formatPrice(totalAmount)}.`;
};

const mergeCartItems = (items: PlaceOrderCartItemInput[]) => {
  const quantities = new Map<number, number>();

  items.forEach((item) => {
    if (item.quantity > 0) {
      quantities.set(item.variantId, (quantities.get(item.variantId) || 0) + item.quantity);
    }
  });

  return Array.from(quantities.entries()).map(([variantId, quantity]) => ({
    quantity,
    variantId
  }));
};

const validateInput = (input: PlaceOrderInput): ValidationResult => {
  const deliveryAddress = normalizeText(input.deliveryAddress);
  if (!deliveryAddress) return { error: buildError('Delivery address is required.', 'INVALID_DELIVERY_ADDRESS'), ok: false };

  const paymentMethod = normalizePaymentMethod(input.paymentMethod);
  if (!paymentMethod) return { error: buildError('Payment method must be cash or card.', 'INVALID_PAYMENT_METHOD'), ok: false };

  const cartItems = mergeCartItems(input.cart.items);
  if (!cartItems.length) return { error: buildError('Cart is empty. Add items before placing an order.', 'EMPTY_CART'), ok: false };

  return { cartItems, deliveryAddress, ok: true, paymentMethod };
};

const createUnavailableItemsError = () => {
  return buildError('Some items from the cart are no longer available.', 'CART_ITEMS_UNAVAILABLE');
};

const resolveDomain = async (hostname: string) => {
  const domain = await findDomain(hostname);
  return domain || null;
};

const createPlacedOrder = async (
  input: PlaceOrderInput,
  domainId: string,
  validation: ValidationSuccess
) => {
  const variants = await loadVariants(domainId, validation.cartItems);
  if (variants.length !== validation.cartItems.length) return createUnavailableItemsError();

  const orderItems = buildOrderItems(validation.cartItems, buildVariantMap(variants));
  const totals = calculateTotals(orderItems);
  const order = await createOrder(
    input,
    domainId,
    validation.paymentMethod,
    validation.deliveryAddress,
    orderItems,
    totals
  );

  return buildSuccessResult(order, validation.paymentMethod, totals);
};

const findDomain = async (hostname: string) => {
  return prisma.domain.findUnique({ where: { hostname } });
};

const loadVariants = async (domainId: string, cartItems: PlaceOrderCartItemInput[]) => {
  return prisma.productVariant.findMany({
    where: {
      id: { in: cartItems.map((item) => item.variantId) },
      isAvailable: true,
      product: {
        domainId,
        status: 'active'
      }
    },
    include: {
      product: {
        select: {
          title: true
        }
      }
    }
  });
};

const buildVariantMap = (variants: VariantWithProduct[]) => {
  return new Map(variants.map((variant) => [variant.id, variant]));
};

const buildOrderItems = (
  cartItems: PlaceOrderCartItemInput[],
  variantMap: Map<number, VariantWithProduct>
) => {
  return cartItems.map((item) => {
    const variant = variantMap.get(item.variantId)!;
    return {
      productId: variant.productId,
      productTitle: variant.product.title,
      quantity: item.quantity,
      sku: variant.sku,
      totalPrice: variant.price * item.quantity,
      unitPrice: variant.price,
      variantId: variant.id,
      variantTitle: variant.title
    };
  });
};

const calculateTotals = (items: OrderItemDraft[]) => {
  return {
    totalAmount: items.reduce((sum, item) => sum + item.totalPrice, 0),
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0)
  };
};

const createOrder = async (
  input: PlaceOrderInput,
  domainId: string,
  paymentMethod: PaymentMethod,
  deliveryAddress: string,
  orderItems: OrderItemDraft[],
  totals: { totalAmount: number; totalItems: number }
) => {
  return prisma.order.create({
    data: {
      cartSnapshot: input.cart as unknown as Prisma.InputJsonValue,
      comment: normalizeText(input.comment),
      customerName: normalizeText(input.customerName),
      customerPhone: normalizeText(input.customerPhone),
      deliveryAddress,
      domainId,
      items: { create: orderItems },
      paymentMethod,
      totalAmount: totals.totalAmount,
      totalItems: totals.totalItems
    },
    include: { items: true }
  });
};

const buildSuccessResult = (
  order: Awaited<ReturnType<typeof createOrder>>,
  paymentMethod: PaymentMethod,
  totals: { totalAmount: number; totalItems: number }
): PlaceOrderResult => {
  return {
    success: true,
    response: buildOrderResponse(order.id, totals.totalItems, totals.totalAmount),
    order: {
      comment: order.comment || undefined,
      createdAt: order.createdAt.toISOString(),
      customerName: order.customerName || undefined,
      customerPhone: order.customerPhone || undefined,
      deliveryAddress: order.deliveryAddress,
      id: order.id,
      items: order.items.map((item) => ({
        productTitle: item.productTitle,
        quantity: item.quantity,
        sku: item.sku || undefined,
        totalPrice: item.totalPrice,
        unitPrice: item.unitPrice,
        variantId: item.variantId,
        variantTitle: item.variantTitle
      })),
      paymentMethod: paymentMethod === PaymentMethod.CASH ? 'cash' : 'card',
      totalAmount: totals.totalAmount,
      totalItems: totals.totalItems
    }
  };
};

export class OrderService {
  async placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
    const validation = validateInput(input);
    if (!validation.ok) return validation.error;

    const domain = await resolveDomain(input.hostname);
    if (!domain) return buildError('Domain was not found.', 'DOMAIN_NOT_FOUND');

    return createPlacedOrder(input, domain.id, validation);
  }
}

export const orderService = new OrderService();
