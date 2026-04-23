import { LocalCartSnapshot } from './cart.types';

export const CART_CHANGED_EVENT = 'ai-assistant:cart-changed';

export const dispatchCartChanged = (cart: LocalCartSnapshot) => {
  document.dispatchEvent(
    new CustomEvent<LocalCartSnapshot>(CART_CHANGED_EVENT, {
      detail: cart
    })
  );
};
