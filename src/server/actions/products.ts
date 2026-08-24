'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requirePermission } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit'
import {
  archiveProduct,
  createProduct,
  createProductCategory,
  createSupplier,
  setProductActive,
  updateProduct,
} from '@/features/products/service'
import { productCategorySchema, productSchema, supplierSchema } from '@/validators/product'
import { uuidSchema } from '@/validators/common'
import type { FormState } from './types'
import { checkbox, fail, fromZod, ok, text } from './form'

function readProductForm(formData: FormData) {
  return productSchema.safeParse({
    name: text(formData, 'name'),
    categoryId: text(formData, 'categoryId'),
    supplierId: text(formData, 'supplierId'),
    brand: text(formData, 'brand'),
    sku: text(formData, 'sku'),
    barcode: text(formData, 'barcode'),
    unit: text(formData, 'unit') || 'un',
    cost: text(formData, 'cost') || 0,
    price: text(formData, 'price'),
    minStock: text(formData, 'minStock') || 0,
    isForSale: checkbox(formData, 'isForSale'),
    isSupply: checkbox(formData, 'isSupply'),
    isActive: checkbox(formData, 'isActive'),
  })
}

export async function createProductAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('products.manage')
  const parsed = readProductForm(formData)
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const productId = await createProduct(context.tenant.id, parsed.data)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'product.created',
      entity: 'product',
      entityId: productId,
      summary: `Produto criado: ${parsed.data.name}`,
    })
    revalidatePath('/produtos')
    revalidatePath('/estoque')
    return ok('Produto criado.', { id: productId })
  } catch (error) {
    return fail(error)
  }
}

export async function updateProductAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('products.manage')
  const productId = uuidSchema.safeParse(text(formData, 'productId'))
  if (!productId.success) return fail(productId.error)

  const parsed = readProductForm(formData)
  if (!parsed.success) return fromZod(parsed.error)

  try {
    await updateProduct(context.tenant.id, productId.data, parsed.data)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'product.updated',
      entity: 'product',
      entityId: productId.data,
      summary: `Produto atualizado: ${parsed.data.name}`,
    })
    revalidatePath('/produtos')
    revalidatePath('/estoque')
    return ok('Produto atualizado.')
  } catch (error) {
    return fail(error)
  }
}

export async function toggleProductAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('products.manage')
  const parsed = z
    .object({ productId: uuidSchema, isActive: z.enum(['true', 'false']) })
    .safeParse({
      productId: text(formData, 'productId'),
      isActive: text(formData, 'isActive'),
    })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const isActive = parsed.data.isActive === 'true'
    await setProductActive(context.tenant.id, parsed.data.productId, isActive)
    revalidatePath('/produtos')
    return ok(isActive ? 'Produto ativado.' : 'Produto desativado.')
  } catch (error) {
    return fail(error)
  }
}

export async function archiveProductAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('products.manage')
  const productId = uuidSchema.safeParse(text(formData, 'productId'))
  if (!productId.success) return fail(productId.error)

  try {
    await archiveProduct(context.tenant.id, productId.data)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'product.archived',
      entity: 'product',
      entityId: productId.data,
    })
    revalidatePath('/produtos')
    revalidatePath('/estoque')
    return ok('Produto removido do catálogo.')
  } catch (error) {
    return fail(error)
  }
}

export async function createProductCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('products.manage')
  const parsed = productCategorySchema.safeParse({ name: text(formData, 'name') })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const id = await createProductCategory(context.tenant.id, parsed.data.name)
    revalidatePath('/produtos')
    return ok('Categoria criada.', { id })
  } catch (error) {
    return fail(error)
  }
}

export async function createSupplierAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('products.manage')
  const parsed = supplierSchema.safeParse({
    name: text(formData, 'name'),
    phone: text(formData, 'phone'),
    email: text(formData, 'email'),
    document: text(formData, 'document'),
    notes: text(formData, 'notes'),
  })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const id = await createSupplier(context.tenant.id, parsed.data)
    revalidatePath('/produtos')
    return ok('Fornecedor criado.', { id })
  } catch (error) {
    return fail(error)
  }
}
