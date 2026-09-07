export type ProductMedia = {
  id: string;
  media_type: "image" | "video";
  url: string;
  sort_order: number;
};

export type ProductVariant = {
  id: string;
  colour: string;
  colour_hex: string;
  size: string;
  sku: string;
  stock: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  sale_price: number | null;
  rating: number;
  review_count: number;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  is_on_sale: boolean;
  product_variants: ProductVariant[];
  product_media: ProductMedia[];
};

export type CartLine = {
  id: string;
  variant_id: string;
  quantity: number;
  product: Product;
  variant: ProductVariant;
};

export type Address = {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
};
