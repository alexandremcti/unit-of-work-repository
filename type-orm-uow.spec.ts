import { Uow, UowObject } from '.';
import {
    Column,
    DataSource,
    Entity,
    PrimaryColumn,
    Repository as Mapper,
    QueryRunner,
  } from 'typeorm';
  
describe('TypeormWow', () => {
    let connection: DataSource;
    let testEntityMapper: Mapper<TestEntity>;

beforeAll(async () => {
    connection = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'test',
    username: 'test',
    password: 'test',
    entities: [TestEntity],
    dropSchema: true,
    synchronize: true,
    });
    await connection.initialize();
    testEntityMapper = connection.getRepository(TestEntity);
});

afterAll(async () => {
    await testEntityMapper.query(`DROP TABLE test_entity;`);
    await connection.destroy();
});

beforeEach(async () => {
    await testEntityMapper.query(
    `TRUNCATE TABLE test_entity RESTART IDENTITY CASCADE;`,
    );
});

function getTestRepository() {
    return new TestRepository(connection);
}

function getTestEntity(id: number, name: string) {
    const entity = new TestEntity();
    entity.id = id;
    entity.name = name;
    return entity;
}
describe('with beginWork declaration', () => {
    it('should do all actions in one transaction after beginWork declaration', async () => {
    const repository = getTestRepository();
    const entity1 = getTestEntity(1, 'first entity');
    const entity2 = getTestEntity(2, 'second entity');
    const entity2Update = getTestEntity(2, 'update entity');
    const entity3 = getTestEntity(3, 'third entity');

    await testEntityMapper.insert(entity2);
    await testEntityMapper.insert(entity3);

    repository.beginWork();
    await repository.create(entity1);
    await repository.update(entity2Update);
    await repository.delete(entity3);

    const countBeforeCommit = await testEntityMapper.count();

    expect(countBeforeCommit).toBe(2);

    await repository.commitWork();

    const countAfterCommit = await testEntityMapper.count();
    const entity1Got = await testEntityMapper.findOne({ where: { id: 1 } });
    const entity2Got = await testEntityMapper.findOne({ where: { id: 2 } });
    const entity3Got = await testEntityMapper.findOne({ where: { id: 3 } });

    expect(countAfterCommit).toBe(2);
    expect(entity1Got).toEqual(entity1);
    expect(entity2Got).toEqual(entity2Update);
    expect(entity3Got).toBeNull();
    });
});
});



class UowEntity implements UowObject<QueryRunner> {
    public async createByTx(tx: QueryRunner) {
        console.log('constructor: ', this.constructor);
        await tx.manager.insert(this.constructor, this);
    }

    public async updateByTx(tx: QueryRunner) {
        const metadata = tx.connection.getMetadata(this.constructor);
        await tx.manager.update(
        this.constructor,
        { ...metadata.getEntityIdMap(this) },
        this,
        );
    }

    public async deleteByTx(tx: QueryRunner) {
        await tx.manager.remove(this);
    }
}

export class UowRepository extends Uow<QueryRunner> {
    public constructor(private connection: DataSource) {
        super();
    }

    protected async begin() {
        const tx = this.connection.createQueryRunner();
        await tx.startTransaction();
        return tx;
    }

    protected commit(tx: QueryRunner) {
        return tx.commitTransaction();
    }

    protected rollback(tx: QueryRunner) {
        return tx.rollbackTransaction();
    }

    protected release(tx: QueryRunner) {
        return tx.release();
    }
}

@Entity()
class TestEntity extends UowEntity {
    @PrimaryColumn('integer')
    public id: number = 0;

    @Column('varchar', {
        length: 32,
    })
    public name: string = '';
}

class TestRepository extends UowRepository {
    public constructor(connection: DataSource) {
        super(connection);
    }

    public async create(entity: TestEntity) {
        await this.markCreate(entity);
    }

    public async update(entity: TestEntity) {
        await this.markUpdate(entity);
    }

    public async delete(entity: TestEntity) {
        await this.markDelete(entity);
    }
}
