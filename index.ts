export interface UnitOfWork {
    beginWork(): void;
    commitWork(): Promise<void>;
}
  
export interface UowObject<Tx> {
    createByTx(tx: Tx): Promise<void>;
    updateByTx(tx: Tx): Promise<void>;
    deleteByTx(tx: Tx): Promise<void>;
}

export abstract class Uow<Tx> implements UnitOfWork {
    private creates: UowObject<Tx>[] = [];
    private updates: UowObject<Tx>[] = [];
    private deletes: UowObject<Tx>[] = [];
    private isActive: boolean = false;

    protected abstract begin(): Promise<Tx>;

    protected abstract commit(tx: Tx): Promise<void>;

    protected abstract rollback(tx: Tx): Promise<void>;

    protected release(tx: Tx): Promise<void> {
        return Promise.resolve();
    }

    beginWork(): void {
        this.isActive = true;
    }

    commitWork(): Promise<void> {
        return this.commitChanges();
    }

    protected markCreate(uowObject: UowObject<Tx>): Promise<void> {
        return this.mark(() => this.creates.push(uowObject));
    }

    protected markUpdate(uowObject: UowObject<Tx>): Promise<void> {
        return this.mark(() => this.updates.push(uowObject));
    }

    protected markDelete(uowObject: UowObject<Tx>): Promise<void> {
        return this.mark(() => this.deletes.push(uowObject));
    }

    private async mark(mark: () => void): Promise<void> {
        //insere no array o uowObject
        mark();

        // commita imediatamante se isActive for false
        //Em outras palavras, commita se não estiver em modo de transaction
        if (!this.isActive) {
        await this.commitChanges();
        }
    }

    private async commitChanges(): Promise<void> {
        const tx = await this.begin();

        try {
        await this.commitCreates(tx);
        await this.commitUpdates(tx);
        await this.commitDeletes(tx);
        await this.commit(tx);
        } catch (error) {
        await this.rollback(tx);
        throw error;
        } finally {
        await this.release(tx);
        this.dispose();
        }
    }

    private async commitCreates(tx: Tx): Promise<void> {
        await Promise.all(this.creates.map((m) => m.createByTx(tx)));
    }

    private async commitUpdates(tx: Tx): Promise<void> {
        await Promise.all(this.updates.map((m) => m.updateByTx(tx)));
    }

    private async commitDeletes(tx: Tx): Promise<void> {
        await Promise.all(this.deletes.map((m) => m.deleteByTx(tx)));
    }

    private dispose() {
        this.creates = [];
        this.updates = [];
        this.deletes = [];
        this.isActive = false;
    }
    }

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
