import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { setupApp } from './../src/setup-app';

describe('Authentication (e2e)', () => {
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

  describe('signup', () => {
    it('creates a user and returns id and email, never the password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'a@b.com', password: 'mypassword' })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.email).toEqual('a@b.com');
      expect(res.body.password).toBeUndefined();
    });

    it('signs the new user in by setting a session cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'a@b.com', password: 'mypassword' })
        .expect(201);

      const cookie = res.get('Set-Cookie');
      expect(cookie).toBeDefined();
      expect(cookie!.join(';')).toContain('session=');
    });

    it('rejects a malformed email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'not-an-email', password: 'mypassword' })
        .expect(400);

      expect(res.body.message).toContain('email must be an email');
    });

    it('rejects a duplicate email', async () => {
      const server = app.getHttpServer();

      await request(server)
        .post('/auth/signup')
        .send({ email: 'a@b.com', password: 'mypassword' })
        .expect(201);

      const res = await request(server)
        .post('/auth/signup')
        .send({ email: 'a@b.com', password: 'other' })
        .expect(400);

      expect(res.body.message).toEqual('email in use');
    });

    it('strips fields that are not on the DTO', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'a@b.com', password: 'mypassword', isAdmin: true })
        .expect(201);

      expect(res.body.isAdmin).toBeUndefined();
    });
  });

  describe('signin', () => {
    it('succeeds with the correct password', async () => {
      const server = app.getHttpServer();

      await request(server)
        .post('/auth/signup')
        .send({ email: 'a@b.com', password: 'mypassword' })
        .expect(201);

      const res = await request(server)
        .post('/auth/signin')
        .send({ email: 'a@b.com', password: 'mypassword' })
        .expect(201);

      expect(res.body.email).toEqual('a@b.com');
      expect(res.body.password).toBeUndefined();
    });

    it('rejects a wrong password', async () => {
      const server = app.getHttpServer();

      await request(server)
        .post('/auth/signup')
        .send({ email: 'a@b.com', password: 'mypassword' })
        .expect(201);

      await request(server)
        .post('/auth/signin')
        .send({ email: 'a@b.com', password: 'wrongpassword' })
        .expect(400);
    });

    it('404s for an unknown email', async () => {
      await request(app.getHttpServer())
        .post('/auth/signin')
        .send({ email: 'nobody@b.com', password: 'mypassword' })
        .expect(404);
    });
  });

  describe('whoami', () => {
    it('is blocked by AuthGuard when signed out', async () => {
      await request(app.getHttpServer()).get('/auth/whoami').expect(403);
    });

    it('returns the signed-in user', async () => {
      const agent = request.agent(app.getHttpServer());

      const signup = await agent
        .post('/auth/signup')
        .send({ email: 'a@b.com', password: 'mypassword' })
        .expect(201);

      const res = await agent.get('/auth/whoami').expect(200);

      expect(res.body.id).toEqual(signup.body.id);
      expect(res.body.email).toEqual('a@b.com');
      expect(res.body.password).toBeUndefined();
    });

    it('is blocked again after signout, then works again after signin', async () => {
      const agent = request.agent(app.getHttpServer());

      await agent
        .post('/auth/signup')
        .send({ email: 'a@b.com', password: 'mypassword' })
        .expect(201);
      await agent.get('/auth/whoami').expect(200);

      await agent.post('/auth/signout').expect(201);
      await agent.get('/auth/whoami').expect(403);

      await agent
        .post('/auth/signin')
        .send({ email: 'a@b.com', password: 'mypassword' })
        .expect(201);
      await agent.get('/auth/whoami').expect(200);
    });

    it('does not leak one session into another client', async () => {
      const signedIn = request.agent(app.getHttpServer());
      const anonymous = request.agent(app.getHttpServer());

      await signedIn
        .post('/auth/signup')
        .send({ email: 'a@b.com', password: 'mypassword' })
        .expect(201);

      await signedIn.get('/auth/whoami').expect(200);
      await anonymous.get('/auth/whoami').expect(403);
    });
  });

  describe('user routes', () => {
    it('400s on a non-numeric id', async () => {
      await request(app.getHttpServer()).get('/auth/abc').expect(400);
    });

    it('404s for an id that does not exist', async () => {
      await request(app.getHttpServer()).get('/auth/9999').expect(404);
    });

    it('finds users by email and deletes them', async () => {
      const server = app.getHttpServer();

      const signup = await request(server)
        .post('/auth/signup')
        .send({ email: 'a@b.com', password: 'mypassword' })
        .expect(201);

      const list = await request(server)
        .get('/auth?email=a@b.com')
        .expect(200);
      expect(list.body).toHaveLength(1);

      await request(server).delete(`/auth/${signup.body.id}`).expect(200);
      await request(server).get(`/auth/${signup.body.id}`).expect(404);
    });
  });

  it('starts each test with an empty database', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth?email=a@b.com')
      .expect(200);

    expect(res.body).toEqual([]);
  });
});
