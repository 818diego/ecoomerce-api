# Stock — Guía frontend

## Auth
Todos los endpoints de stock requieren:
```
Authorization: Bearer <token>
```
Roles: `administrador` o `manager`.

---

## Producto
El producto ahora incluye `stock: number` (default `0`).

Al crear producto puedes enviar stock inicial:
```json
{ "stock": 10 }
```

---

## Registrar movimiento
```
PATCH /products/:id/stock
```

**Body:**
```json
{
  "type": "entrada",
  "quantity": 10,
  "observations": "Reposición de proveedor"
}
```

| type | Efecto |
|------|--------|
| `entrada` | suma `quantity` al stock |
| `salida` | resta `quantity` (error si no hay suficiente) |
| `ajuste` | establece el stock al valor exacto de `quantity` |

**Respuesta:**
```json
{
  "product": { "id": 1, "stock": 10, "..." },
  "movement": {
    "id": 1,
    "type": "entrada",
    "quantity": 10,
    "previousStock": 0,
    "newStock": 10,
    "observations": "Reposición de proveedor",
    "user": { "id": 2, "name": "Juan", "email": "juan@mail.com" },
    "createdAt": "2026-08-15T07:42:25.103Z"
  }
}
```

El usuario se toma del token, no se envía en el body.

---

## Historial de movimientos
```
GET /products/:id/stock/movements?page=1&limit=10
```

**Respuesta:**
```json
{
  "data": [
    {
      "id": 1,
      "productId": 1,
      "type": "entrada",
      "quantity": 10,
      "previousStock": 0,
      "newStock": 10,
      "observations": "Reposición de proveedor",
      "user": { "id": 2, "name": "Juan", "email": "juan@mail.com" },
      "createdAt": "2026-08-15T07:42:25.103Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "lastPage": 1, "limit": 10 }
}
```

Orden: más reciente primero.

---

## Errores comunes
| Status | Mensaje |
|--------|---------|
| 400 | Stock insuficiente para realizar la salida |
| 400 | La cantidad de una entrada/salida debe ser mayor a 0 |
| 401 | Token inválido o usuario inactivo |
| 403 | Sin permisos (rol incorrecto) |
| 404 | Producto no encontrado |
