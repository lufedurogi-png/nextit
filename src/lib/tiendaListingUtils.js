/** Helpers compartidos entre Tienda y Mis publicaciones. */

export function listingTitle(l) {
    return l.marketplace_title || l.item?.title || 'Producto'
}

export function listingAllImages(l) {
    if (Array.isArray(l.marketplace_images) && l.marketplace_images.length) {
        return l.marketplace_images
    }
    const out = []
    if (l.item?.image_path && l.include_primary_item_image !== false) {
        out.push(l.item.image_path)
    }
    if (Array.isArray(l.extra_images) && l.extra_images.length) {
        out.push(...l.extra_images)
    }
    if (out.length === 0 && l.item?.image_path) {
        out.push(l.item.image_path)
    }
    return out
}
