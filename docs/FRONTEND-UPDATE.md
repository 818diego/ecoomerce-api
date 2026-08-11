# Actualización API — Productos y Categorías

Cambios recientes que el frontend debe tener en cuenta.

## Resumen

| Cambio | Impacto en frontend |
|--------|---------------------|
| No desactivar categoría con productos activos | Manejar error `409` al desactivar categoría |
| Catálogo público filtra categoría activa | Productos de categorías inactivas no aparecen |
| SKU vacío rechazado | No enviar `sku: ""`; omitir el campo o enviar valor válido |

---

## 1. Desactivar categoría con productos activos

**Endpoint:** `PATCH /categories/:id`

Si la categoría tiene **productos activos**, la API responde:

```json
{
  "success": false,
  "error": "Existen productos activos en esta categoría",
  "message": "Operación fallida",
  "data": null
}
```

**HTTP Status:** `409 Conflict`

**Qué hacer en el frontend:**
- Antes de desactivar, opcionalmente advertir al usuario que debe desactivar o mover los productos primero.
- Mostrar el mensaje de error si la API lo rechaza.
- Flujo sugerido: desactivar productos → luego desactivar categoría.

> Eliminar categoría con productos sigue devolviendo `409` — "Existen productos en esta categoría" (sin importar si están activos o inactivos).

---

## 2. Catálogo público de productos

**Endpoints afectados:**
- `GET /products`
- `GET /products/:id`

Ahora solo devuelven productos que cumplan **ambas** condiciones:
- `product.active === true`
- `category.active === true`

Si un producto está activo pero su categoría está inactiva, **no aparece** en el listado y el detalle devuelve `404`.

**Qué hacer en el frontend:**
- No asumir que un producto activo siempre es visible en la tienda.
- Si un usuario tenía guardado un `productId` y ahora da `404`, redirigir al catálogo.

---

## 3. Validación de SKU

**Endpoints:** `POST /products`, `PATCH /products/:id`

- `sku` es **opcional**, pero si se envía no puede ser string vacío (`""`).
- Espacios en blanco se recortan en el backend.

**Correcto:**
```json
{ "name": "Producto", "price": 10, "categoryId": 1 }
```
```json
{ "name": "Producto", "price": 10, "categoryId": 1, "sku": "PROD-001" }
```

**Incorrecto (400):**
```json
{ "name": "Producto", "price": 10, "categoryId": 1, "sku": "" }
```

**Mensaje de error:** `El SKU no puede estar vacío`

---

## Reglas de negocio — referencia rápida

```
Categoría activa   + Producto activo   → Visible en tienda
Categoría activa   + Producto inactivo → No visible
Categoría inactiva + Producto activo   → No visible
Categoría inactiva + Producto inactivo → No visible
```

**Para desactivar una categoría:** primero desactivar (o eliminar) todos sus productos activos.

**Para eliminar una categoría:** no debe tener ningún producto asociado (activo o inactivo).

---

## Sin cambios en contratos existentes

- Formato de respuesta (`success`, `data`, `error`) — igual.
- Campos obligatorios al crear producto: `name`, `price`, `categoryId`.
- Autenticación JWT en rutas admin — igual.
- Bodies de POST/PATCH de productos — igual (solo validación más estricta en `sku`).
