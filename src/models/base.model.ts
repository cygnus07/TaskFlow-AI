// this is the base model for tenant isolation

import { Schema, Document, Model, Query, SchemaDefinition } from 'mongoose'

export interface IBaseDocument extends Document {
    tenantId: string
    createdAt: Date
    updatedAt: Date
}

// function to add tenant isolation to any schema
export function addTenantIsolation<T extends Document>(
    schema: Schema<T>
): void {
    if (!('tenantId' in schema.paths)) {
        const tenantField: SchemaDefinition<IBaseDocument> = {
            tenantId: {
                type: String,
                required: true,
                index: true
            }
        };
        schema.add(tenantField as any);
    }
    
    
    schema.set('timestamps', true)
    
    schema.pre(/^find/, function (this: Query<any,any>) {
        if(!this.getQuery().tenantId){
            // in real app - from a request context
            // for  now we'll handle this in service layer
        }
    })

    schema.pre(/^update/, function(this: Query<any,any> ) {
        const update = this.getUpdate() as any
        delete update.tenantId
    } )

    schema.index({
        tenantId: 1,
        createdAt: -1
    })
}

export type TenantModel<T extends Document> = Model<T> & {
  byTenant(tenantId: string): Query<T[], T>;
};