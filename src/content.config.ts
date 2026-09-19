import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const menu = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/menu' }),
  schema: z.object({
    name: z.string(),
    order: z.number(),
    note: z.string().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    items: z.array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        price: z.number().nonnegative(),
        options: z.string().optional(),
        variants: z
          .array(
            z.object({
              label: z.string(),
              price: z.number().nonnegative(),
            })
          )
          .optional(),
        tags: z
          .array(z.enum(['spicy', 'veggie', 'house-special', 'kids']))
          .optional(),
      })
    ),
  }),
});

export const collections = { menu };
