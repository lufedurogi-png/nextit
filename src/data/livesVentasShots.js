import image0 from '../../public/Imagenes/LivesVentas/image-0.png'
import image1 from '../../public/Imagenes/LivesVentas/image-1.png'
import image2 from '../../public/Imagenes/LivesVentas/image-2.png'
import image3 from '../../public/Imagenes/LivesVentas/image-3.png'
import image4 from '../../public/Imagenes/LivesVentas/image-4.png'
import image5 from '../../public/Imagenes/LivesVentas/image-5.png'
import image6 from '../../public/Imagenes/LivesVentas/image-6.png'

const assets = [image0, image1, image2, image3, image4, image5, image6]

/** Capturas embebidas en el build (_next/static) para que Hostinger las sirva. */
export const LIVES_VENTAS_SHOTS = assets.map((asset, n) => ({
    src: typeof asset === 'string' ? asset : asset.src,
    alt: `Lives Ventas — captura ${n + 1}`,
}))
