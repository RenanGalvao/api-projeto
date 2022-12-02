import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Agenda, Field } from '@prisma/client';
import { AgendaService } from 'src/agenda/agenda.service';
import { AppModule } from 'src/app.module';
import { ITEMS_PER_PAGE, TEMPLATE } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { createField } from 'src/utils/test';
import { v4 as uuidv4 } from 'uuid';

describe('Agenda Service Integration', () => {
  let prisma: PrismaService;
  let agendaService: AgendaService;

  let field: Field;

  const title = 'Título';
  const message = 'Mensagem';
  const date = new Date('2022-02-02');

  const createAgenda = async (
    title: string,
    message: string,
    date: Date,
    field: string,
  ) =>
    await prisma.agenda.create({
      data: {
        title,
        message,
        date,
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
    agendaService = moduleRef.get(AgendaService);

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
    it('Should Create an Event', async () => {
      const event = await agendaService.create({
        title,
        message,
        date,
        field: field.id,
      });
    });
  });

  describe('findAll()', () => {
    it('Should Return an Empty Array', async () => {
      const response = await agendaService.findAll();

      expect(response.data).toHaveLength(0);
      expect(response.totalCount).toBe(0);
      expect(response.totalPages).toBe(0);
    });

    it(`Should Return a Volunteer List With ${ITEMS_PER_PAGE} Items`, async () => {
      const eventsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              title: `Título ${i}`,
              message: 'Mensagem',
              date: new Date('2022-01-03'),
              fieldId: field.id,
            } as Agenda),
        );
      await prisma.agenda.createMany({
        data: eventsToCreate,
      });

      const response = await agendaService.findAll();
      expect(response.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(1);
    });

    const randomN = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return a Work List With ${randomN} Items`, async () => {
      const eventsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              title: `Título ${i}`,
              message: 'Mensagem',
              date: new Date('2022-01-03'),
              fieldId: field.id,
            } as Agenda),
        );
      await prisma.agenda.createMany({
        data: eventsToCreate,
      });

      const response = await agendaService.findAll({
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
      const event = await agendaService.findOne(randomId);

      expect(event).toBeNull();
    });

    it('Should Return an Event', async () => {
      const eventCreated = await createAgenda(title, message, date, field.id);

      const event = await agendaService.findOne(eventCreated.id);
      expect(event).toBeDefined();
    });
  });

  describe('update()', () => {
    it('Should Not Update an Event (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await agendaService.update(randomId, { title: 'lol' });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('evento', 'o'),
        );
      }
    });

    it('Should Update an Event', async () => {
      const event = await createAgenda(title, message, date, field.id);
      const newTitle = 'Novo Título';

      const volunteerUpdated = await agendaService.update(event.id, {
        title: newTitle,
      });
      expect(volunteerUpdated).toBeDefined();
      expect(volunteerUpdated.title).toBe(newTitle);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove an Event (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await agendaService.remove(randomId);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('evento', 'o'),
        );
      }
    });

    it('Should Remove an Event', async () => {
      const event = await createAgenda(title, message, date, field.id);

      await agendaService.remove(event.id);
      const isEventDeleted = await prisma.agenda.findFirst({
        where: {
          id: event.id,
          deleted: { lte: new Date() },
        },
      });
      expect(isEventDeleted.deleted).toBeDefined();
    });
  });

  describe('restore()', () => {
    it('Should Restore an Event', async () => {
      const event = await createAgenda(title, message, date, field.id);
      await prisma.agenda.delete({ where: { id: event.id } });

      await agendaService.restore({ ids: [event.id] });
      const isEventRestored = await prisma.agenda.findFirst({
        where: {
          id: event.id,
        },
      });

      expect(isEventRestored.deleted).toBeNull();
    });
  });

  describe('hardRemove()', () => {
    it('Should Hard Remove an Event', async () => {
      const event = await createAgenda(title, message, date, field.id);
      await prisma.agenda.delete({ where: { id: event.id } });

      await agendaService.hardRemove({ ids: [event.id] });
      const isEventRemoved = await prisma.agenda.findFirst({
        where: {
          id: event.id,
          deleted: { not: new Date() },
        },
      });
      expect(isEventRemoved).toBeNull();
    });
  });
});
