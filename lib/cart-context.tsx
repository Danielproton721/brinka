"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

export interface CartItem {
  id: number
  slug: string
  name: string
  price: number
  compareAtPrice?: number
  image: string
  quantity: number
  customization?: string      // texto que o cliente quer gravar (produtos personalizáveis)
  customizationImage?: string // imagem enviada (dataURL), opcional
}

interface CartContextType {
  items: CartItem[]
  isOpen: boolean
  totalItems: number
  totalPrice: number
  totalCompareAtPrice: number
  totalSavings: number
  couponApplied: boolean
  couponCode: string
  couponPct: number
  couponDiscount: number
  applyCoupon: () => void
  removeCoupon: () => void
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void
  removeItem: (id: number) => void
  updateQuantity: (id: number, quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
  openCart: () => void
  closeCart: () => void
}

const CartContext = createContext<CartContextType | null>(null)

const STORAGE_KEY = "brinka-cart"
// Cupom do popup de boas-vindas. Aplicado aqui, o desconto flui pro carrinho,
// checkout e valor cobrado no gateway (tudo deriva do totalPrice do contexto).
export const COUPON_CODE = "PRIMEIRACOMPRA"
export const COUPON_PCT = 5
const COUPON_KEY = "fn_coupon_applied"

function getValidCompareAtPrice(item: Pick<CartItem, "price" | "compareAtPrice">) {
  return item.compareAtPrice && item.compareAtPrice > item.price
    ? item.compareAtPrice
    : undefined
}

// Nota de performance: este arquivo NÃO pode importar lib/products — ele vive
// no layout raiz, e o catálogo inteiro (~345KB) iria pro bundle client de
// todas as páginas. O compareAtPrice já chega pronto de quem chama addItem.
function loadCart(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // silent fail
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [couponApplied, setCouponApplied] = useState(false)

  useEffect(() => {
    setItems(loadCart())
    try {
      setCouponApplied(localStorage.getItem(COUPON_KEY) === "1")
    } catch {
      // silent fail
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      saveCart(items)
    }
  }, [items, mounted])

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalCompareAtPrice = items.reduce(
    (sum, item) => sum + (getValidCompareAtPrice(item) ?? item.price) * item.quantity,
    0
  )
  const totalSavings = Math.max(0, totalCompareAtPrice - totalPrice)
  // Arredondado pro centavo — este valor é descontado do total cobrado no gateway.
  const couponDiscount = couponApplied ? Math.round(totalPrice * COUPON_PCT) / 100 : 0

  const applyCoupon = useCallback(() => {
    setCouponApplied(true)
    try {
      localStorage.setItem(COUPON_KEY, "1")
    } catch {
      // silent fail
    }
  }, [])

  const removeCoupon = useCallback(() => {
    setCouponApplied(false)
    try {
      localStorage.removeItem(COUPON_KEY)
    } catch {
      // silent fail
    }
  }, [])

  const addItem = useCallback((newItem: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.id === newItem.id)
      if (existing) {
        return prev.map((item) =>
          item.id === newItem.id
            ? { ...item, ...newItem, quantity: item.quantity + quantity }
            : item
        )
      }
      return [...prev, { ...newItem, quantity }]
    })
    setIsOpen(true)
  }, [])

  const removeItem = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const updateQuantity = useCallback((id: number, quantity: number) => {
    if (quantity < 1) {
      setItems((prev) => prev.filter((item) => item.id !== id))
      return
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const toggleCart = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        totalItems,
        totalPrice,
        totalCompareAtPrice,
        totalSavings,
        couponApplied,
        couponCode: COUPON_CODE,
        couponPct: COUPON_PCT,
        couponDiscount,
        applyCoupon,
        removeCoupon,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        toggleCart,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
