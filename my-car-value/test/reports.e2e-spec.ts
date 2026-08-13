import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { setupApp } from './../src/setup-app';

const report = {
  make: 'Honda',
  model: 'Civic',
  year: 2021,
  mileage: 12000,
  lng: -122.4194,
  lat: 37.7749,
  price: 22000,
};

describe('Reports (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  /** Signs a user up and returns an agent carrying its session cookie. */
  const signedInAgent = async (email = 'a@b.com') => {
    const agent = request.agent(app.getHttpServer());
    const res = await agent
      .post('/auth/signup')
      .send({ email, password: 'mypassword' })
      .expect(201);

    return { agent, userId: res.body.id as number };
  };

  describe('create', () => {
    it('is blocked when signed out', async () => {
      await request(app.getHttpServer())
        .post('/reports')
        .send(report)
        .expect(403);
    });

    it('creates an unapproved report owned by the current user', async () => {
      const { agent, userId } = await signedInAgent();

      const res = await agent.post('/reports').send(report).expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.approved).toBe(false);
      expect(res.body.userId).toEqual(userId);
    });

    it('rejects an out-of-range year and a bad latitude', async () => {
      const { agent } = await signedInAgent();

      await agent
        .post('/reports')
        .send({ ...report, year: 1800 })
        .expect(400);
      await agent
        .post('/reports')
        .send({ ...report, lat: 999 })
        .expect(400);
    });

    it('strips fields that are not on the DTO', async () => {
      const { agent } = await signedInAgent();

      const res = await agent
        .post('/reports')
        .send({ ...report, approved: true })
        .expect(201);

      expect(res.body.approved).toBe(false);
    });
  });

  describe('approval', () => {
    it('is blocked when signed out', async () => {
      const { agent } = await signedInAgent();
      const created = await agent.post('/reports').send(report).expect(201);

      await request(app.getHttpServer())
        .patch(`/reports/${created.body.id}`)
        .send({ approved: true })
        .expect(403);
    });

    it('approves and un-approves, keeping userId in the response', async () => {
      const { agent, userId } = await signedInAgent();
      const created = await agent.post('/reports').send(report).expect(201);

      const approved = await agent
        .patch(`/reports/${created.body.id}`)
        .send({ approved: true })
        .expect(200);
      expect(approved.body.approved).toBe(true);
      // Regression: changeApproval must load the user relation, or the
      // response silently drops the userId that create() returns.
      expect(approved.body.userId).toEqual(userId);

      const reverted = await agent
        .patch(`/reports/${created.body.id}`)
        .send({ approved: false })
        .expect(200);
      expect(reverted.body.approved).toBe(false);
    });

    it('rejects a non-boolean approved value', async () => {
      const { agent } = await signedInAgent();
      const created = await agent.post('/reports').send(report).expect(201);

      await agent
        .patch(`/reports/${created.body.id}`)
        .send({ approved: 'yes' })
        .expect(400);
    });

    it('404s for a report that does not exist', async () => {
      const { agent } = await signedInAgent();

      await agent.patch('/reports/9999').send({ approved: true }).expect(404);
    });

    it('400s on a non-numeric id', async () => {
      const { agent } = await signedInAgent();

      await agent.patch('/reports/abc').send({ approved: true }).expect(400);
    });
  });

  it('preserves coordinate precision through a write and re-read', async () => {
    // Regression: a plain @Column() maps to sqlite `integer`, and TypeORM
    // parseInt()s it on read, turning 37.7749 into 37.
    const { agent } = await signedInAgent();

    const created = await agent.post('/reports').send(report).expect(201);
    const reread = await agent
      .patch(`/reports/${created.body.id}`)
      .send({ approved: true })
      .expect(200);

    expect(reread.body.lng).toBeCloseTo(-122.4194, 4);
    expect(reread.body.lat).toBeCloseTo(37.7749, 4);
  });
});
