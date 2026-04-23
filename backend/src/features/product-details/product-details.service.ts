import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import { resolveProductReference } from './product-reference-resolver';
import {
  GetProductDetailsArgs,
  GetProductDetailsResult,
  ProductDetailsFailure,
  ProductDetailsPayload,
  ProductVariantDetails,
  ResolvedProductReference
} from './product-details.types';

const buildInvalidArgsResult = (): ProductDetailsFailure => {
  return {
    success: false,
    error: 'INVALID_PRODUCT_REFERENCE',
    response: 'Provide a product query, productId, or variantId.'
  };
};

const buildDomainNotFoundResult = (): ProductDetailsFailure => {
  return {
    success: false,
    error: 'DOMAIN_NOT_FOUND',
    response: 'Domain was not found.'
  };
};

const buildProductNotFoundResult = (): ProductDetailsFailure => {
  return {
    success: false,
    error: 'PRODUCT_NOT_FOUND',
    response: 'The requested product was not found.'
  };
};

const buildContextFailure = (
  error: string,
  candidates?: ProductDetailsFailure['candidates']
): ProductDetailsFailure => {
  return {
    success: false,
    error,
    candidates,
    response: buildContextFailureMessage(error, candidates)
  };
};

const buildContextFailureMessage = (
  error: string,
  candidates?: ProductDetailsFailure['candidates']
) => {
  if (error === 'AMBIGUOUS_PRODUCT_REFERENCE' && candidates?.length) {
    const titles = candidates.map((candidate) => candidate.title).join(', ');
    return `Multiple recent products match this request: ${titles}. Ask the user which one they mean.`;
  }

  if (error === 'PRODUCT_CONTEXT_EMPTY') {
    return 'No recent product context is available. Search for the product first.';
  }

  return 'The product could not be matched to the recent search results. Ask the user to clarify which item they mean.';
};

const toPositiveNumber = (value?: number) => {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : undefined;
};

const hasDirectReference = (args: GetProductDetailsArgs) => {
  return Boolean(toPositiveNumber(args.productId) || toPositiveNumber(args.variantId));
};

const resolveReference = (args: GetProductDetailsArgs) => {
  if (hasDirectReference(args)) {
    return {
      productId: toPositiveNumber(args.productId),
      variantId: toPositiveNumber(args.variantId)
    };
  }

  const resolution = resolveProductReference(args.query, args.contextProducts);
  if (!resolution.reference) return buildContextFailure(resolution.error || 'UNKNOWN', resolution.candidates);
  return resolution.reference;
};

const findDomainId = async (hostname: string) => {
  const domain = await prisma.domain.findUnique({ where: { hostname } });
  return domain?.id;
};

const variantOrderBy = [{ isDefault: 'desc' as const }, { price: 'asc' as const }];

const findProductByProductId = (
  domainId: string,
  productId: number
) => {
  return prisma.product.findFirst({
    where: { id: productId, domainId, status: 'active' },
    include: {
      variants: {
        where: { isAvailable: true },
        orderBy: variantOrderBy
      }
    }
  });
};

const findProductByVariantId = (
  domainId: string,
  variantId: number
) => {
  return prisma.product.findFirst({
    where: {
      domainId,
      status: 'active',
      variants: { some: { id: variantId, isAvailable: true } }
    },
    include: {
      variants: {
        where: { isAvailable: true },
        orderBy: variantOrderBy
      }
    }
  });
};

const findProductRecord = (
  domainId: string,
  reference: ResolvedProductReference
) => {
  if (reference.variantId) {
    return findProductByVariantId(domainId, reference.variantId);
  }

  if (reference.productId) {
    return findProductByProductId(domainId, reference.productId);
  }

  return Promise.resolve(null);
};

const toAttributes = (value: Prisma.JsonValue | null) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
};

const toOptionalString = (value?: string | null) => {
  return value?.trim() ? value.trim() : undefined;
};

const mapVariant = (
  variant: {
    attributes: Prisma.JsonValue | null;
    id: number;
    price: number;
    sku: string | null;
    title: string;
  }
): ProductVariantDetails => {
  return {
    attributes: toAttributes(variant.attributes),
    id: variant.id,
    price: variant.price,
    sku: toOptionalString(variant.sku),
    title: variant.title
  };
};

const selectVariant = <T extends { id: number }>(
  variants: T[],
  variantId?: number
) => {
  if (!variants.length) return null;
  if (!variantId) return variants[0];
  return variants.find((variant) => variant.id === variantId) || variants[0];
};

const toPayload = (
  product: Awaited<ReturnType<typeof findProductByProductId>>,
  selectedVariantId?: number
): ProductDetailsPayload | null => {
  if (!product?.variants.length) return null;
  const selectedVariant = selectVariant(product.variants, selectedVariantId);
  if (!selectedVariant) return null;

  return {
    availableVariants: product.variants.map(mapVariant),
    brand: toOptionalString(product.brand),
    category: toOptionalString(product.category),
    description: toOptionalString(product.description),
    id: product.id,
    keywords: product.keywords || [],
    selectedVariant: mapVariant(selectedVariant),
    title: product.title
  };
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(price / 100);
};

const buildVariantLabel = (title: string) => {
  return title.trim().toLowerCase() === 'default title' ? '' : ` (${title})`;
};

const buildAttributesSummary = (attributes?: Record<string, unknown>) => {
  if (!attributes) return '';
  const entries = Object.entries(attributes).slice(0, 4);
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join('; ');
};

const buildVariantsSummary = (variants: ProductVariantDetails[]) => {
  if (variants.length < 2) return '';
  return variants
    .slice(0, 3)
    .map((variant) => `${variant.title} - ${formatPrice(variant.price)}`)
    .join(', ');
};

const buildResponse = (product: ProductDetailsPayload) => {
  const details = [
    `${product.title}${buildVariantLabel(product.selectedVariant.title)} costs ${formatPrice(product.selectedVariant.price)}.`,
    product.description ? `Description: ${product.description}.` : '',
    buildAttributesSummary(product.selectedVariant.attributes)
      ? `Details: ${buildAttributesSummary(product.selectedVariant.attributes)}.`
      : '',
    buildVariantsSummary(product.availableVariants)
      ? `Available variants: ${buildVariantsSummary(product.availableVariants)}.`
      : ''
  ].filter(Boolean);

  return details.join(' ');
};

export class ProductDetailsService {
  async getDetails(args: GetProductDetailsArgs): Promise<GetProductDetailsResult> {
    const hostname = toOptionalString(args.hostname);
    if (!hostname) return buildDomainNotFoundResult();

    const reference = resolveReference(args);
    if ('success' in reference) return reference;

    const domainId = await findDomainId(hostname);
    if (!domainId) return buildDomainNotFoundResult();

    const product = await findProductRecord(domainId, reference);
    const payload = toPayload(product, reference.variantId);
    if (!payload) return buildProductNotFoundResult();

    return {
      success: true,
      response: buildResponse(payload),
      product: payload
    };
  }
}

export const productDetailsService = new ProductDetailsService();
