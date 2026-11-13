/** The product lives under the URL hash `#/app`, beside the walkthrough (research R1). */
export const PRODUCT_HASH = "#/app";

export function isProductRoute(hash: string): boolean {
  return hash === PRODUCT_HASH || hash.startsWith(`${PRODUCT_HASH}/`);
}
