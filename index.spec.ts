import { UowObject, Uow } from ".";

type Tx = any;

class UowObjectImpl implements UowObject<Tx> {
  createByTx(tx: any): Promise<void> {
    return Promise.resolve();
  }
  updateByTx(tx: any): Promise<void> {
    return Promise.resolve();
  }
  deleteByTx(tx: any): Promise<void> {
    return Promise.resolve();
  }
}

class UowImpl extends Uow<Tx> {
  public tx: Tx;

  constructor(tx: Tx) {
    super();
    this.tx = tx;
  }

  public begin(): Promise<any> {
    return Promise.resolve(this.tx);
  }

  public commit(): Promise<void> {
    return Promise.resolve(this.tx);
  }

  public rollback(): Promise<void> {
    return Promise.resolve();
  }

  public release(tx: any): Promise<void> {
    return super.release(tx);
  }

  public create(obj: UowObject<Tx>): Promise<void> {
    return this.markCreate(obj);
  }

  public update(obj: UowObject<Tx>) {
    return this.markUpdate(obj);
  }

  public delete(obj: UowObject<Tx>) {
    return this.markDelete(obj);
  }
}


describe('Unit Of Work', () => {
    const tx = {};
  
    describe('with beginWork', () => {
      it('Should create object only when work is committed', async () => {
        const uow = new UowImpl(tx);
        const obj = new UowObjectImpl();
        const objCreateByTx = jest.spyOn(obj, 'createByTx');
  
        uow.beginWork();
        await uow.create(obj);
  
        expect(objCreateByTx).toHaveBeenCalledTimes(0);
  
        await uow.commitWork();
  
        expect(objCreateByTx).toHaveBeenCalledTimes(1);
        expect(objCreateByTx).toHaveBeenCalledWith(tx);
      });
    });
  
    describe('without beginWork', () => {
      it('Should create object when is marked create', async () => {
        const uow = new UowImpl(tx);
        const obj = new UowObjectImpl();
        const objCreateByTx = jest.spyOn(obj, 'createByTx');
  
        await uow.create(obj);
        expect(objCreateByTx).toHaveBeenCalled();
        expect(objCreateByTx).toHaveBeenLastCalledWith(tx);
      });
    });
  });
  