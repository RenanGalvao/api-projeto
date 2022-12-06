import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Field, Testimonial } from '@prisma/client';
import { AppModule } from 'src/app.module';
import { ITEMS_PER_PAGE, TEMPLATE } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { TestimonialService } from 'src/testimonial/testimonial.service';
import { createField } from 'src/utils/test';
import { v4 as uuidv4 } from 'uuid';

describe('Testimonial Service Integration', () => {
  let prisma: PrismaService;
  let testimonialService: TestimonialService;
  let field: Field;

  const name = 'Nome';
  const email = 'joao@email.com';
  const text = 'Texto';

  const createTestimonial = async (
    name: string,
    email: string,
    text: string,
    field: string,
  ) =>
    await prisma.testimonial.create({
      data: {
        name,
        email,
        text,
        field: {
          connect: {
            id: field,
          },
        },
      },
    });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    testimonialService = moduleRef.get(TestimonialService);

    // enable soft delete
    await prisma.onModuleInit();
  });

  beforeEach(async () => {
    await prisma.cleanDataBase();

    field = await createField(
      prisma,
      'América',
      'Brasil',
      'Rio de Janeiro',
      'AMEBRRJ01',
      'Designação',
    );
  });

  describe('create()', () => {
    it('Should Create a Testimonial', async () => {
      const testimonial = await testimonialService.create({
        name,
        email,
        text,
        field: field.id,
      });

      expect(testimonial.name).toBe(name);
      expect(testimonial.email).toBe(email);
      expect(testimonial.text).toStrictEqual(text);
    });
  });

  describe('findAll()', () => {
    it('Should Return an Empty Array', async () => {
      const response = await testimonialService.findAll();

      expect(response.data).toHaveLength(0);
      expect(response.totalCount).toBe(0);
      expect(response.totalPages).toBe(0);
    });

    it(`Should Return a Testimonial List With ${ITEMS_PER_PAGE} Items`, async () => {
      const testimonialsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              name: `Título ${i}`,
              email,
              text,
              fieldId: field.id,
            } as Testimonial),
        );
      await prisma.testimonial.createMany({
        data: testimonialsToCreate,
      });

      const response = await testimonialService.findAll();
      expect(response.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(1);
    });

    const randomN = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return a Testimonial List With ${randomN} Items`, async () => {
      const testimonialsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              name: `Título ${i}`,
              email,
              text,
              fieldId: field.id,
            } as Testimonial),
        );
      await prisma.testimonial.createMany({
        data: testimonialsToCreate,
      });

      const response = await testimonialService.findAll({
        itemsPerPage: randomN,
      });
      expect(response.data).toHaveLength(randomN);
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(
        Math.ceil(response.totalCount / randomN),
      );
    });
  });

  describe('findOne()', () => {
    it("Should Return Null (Doesn't Exists)", async () => {
      const randomId = uuidv4();
      const testimonial = await testimonialService.findOne(randomId);

      expect(testimonial).toBeNull();
    });

    it('Should Return a Testimonial', async () => {
      const testimonialCreated = await createTestimonial(
        name,
        email,
        text,
        field.id,
      );

      const testimonial = await testimonialService.findOne(
        testimonialCreated.id,
      );
      expect(testimonial.name).toBe(name);
      expect(testimonial.email).toBe(email);
      expect(testimonial.text).toStrictEqual(text);
    });
  });

  describe('update()', () => {
    it('Should Not Update a Testimonial (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await testimonialService.update(randomId, { name: 'lol' });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('testemunho', 'o'),
        );
      }
    });

    it('Should Update a Testimonial', async () => {
      const testimonial = await createTestimonial(name, email, text, field.id);
      const newName = 'Novo Título';

      const testimonialUpdated = await testimonialService.update(
        testimonial.id,
        {
          name: newName,
        },
      );
      expect(testimonialUpdated).toBeDefined();
      expect(testimonialUpdated.name).toBe(newName);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove a Testimonial (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await testimonialService.remove(randomId);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('testemunho', 'o'),
        );
      }
    });

    it('Should Remove a Testimonial', async () => {
      const testimonial = await createTestimonial(name, email, text, field.id);

      await testimonialService.remove(testimonial.id);
      const isTestimonialDeleted = await prisma.testimonial.findFirst({
        where: {
          id: testimonial.id,
          deleted: { lte: new Date() },
        },
      });
      expect(isTestimonialDeleted.deleted).toBeDefined();
    });
  });

  describe('restore()', () => {
    it('Should Restore a Testimonial', async () => {
      const testimonial = await createTestimonial(name, email, text, field.id);
      await prisma.testimonial.delete({ where: { id: testimonial.id } });

      await testimonialService.restore({ ids: [testimonial.id] });
      const isTestimonialRestored = await prisma.testimonial.findFirst({
        where: {
          id: testimonial.id,
        },
      });

      expect(isTestimonialRestored.deleted).toBeNull();
    });
  });

  describe('hardRemove()', () => {
    it('Should HardRemove a Testimonial', async () => {
      const testimonial = await createTestimonial(name, email, text, field.id);
      await prisma.testimonial.delete({ where: { id: testimonial.id } });

      await testimonialService.hardRemove({ ids: [testimonial.id] });
      const isTestimonialRemoved = await prisma.testimonial.findFirst({
        where: {
          id: testimonial.id,
          deleted: { not: new Date() },
        },
      });
      expect(isTestimonialRemoved).toBeNull();
    });
  });
});
