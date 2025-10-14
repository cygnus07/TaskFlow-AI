import { Schema, model, Document} from 'mongoose'


export interface ITenant extends Document {
    name: String
    plan: 'free' | 'pro' | 'enterprise'
    isActive: boolean
    maxUsers: number
    currentUsers: number
    settings: {
        allowAIFeatures: boolean
        alloweRealTimecollab: boolean
    }
    createdAt: Date
    updatedAt: Date
}

const tenantSchema = new Schema<ITenant> ({
    name: {
        type: String,
        required: [true, 'Tenant name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    plan: {
        type: String,
        enum: {
            values: ['free', 'pro', 'enterprise'],
            message: 'Invalid plan type'
        },
        default: 'free'
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    maxUsers: {
        type: Number,
        default: function() {
            const limits = {
                free: 5,
                pro: 50,
                enterprise: -1, // this means unlimited
            }
            return limits[this.plan] || 5
        }
    },
    currentUsers: {
        type: Number,
        default: 0,
        min: [0, 'Current users cannot be negative']
    },
    settings: {
        allowAIFeatures: {
            type: Boolean,
            default: function(){
                return this.plan !== 'free'
            }
        },
        alloweRealTimecollab: {
            type: Boolean,
            default: function() {
                return this.plan !== 'free'
            }
        }
    }

},
{
    timestamps: true
}
)

tenantSchema.index({name: 1})
tenantSchema.index({ isActive: 1})
tenantSchema.index({createdAt: -1})

tenantSchema.methods.canAddUsers = function(count = 1){
    if(this.maxUsers === -1) return true
    return (this.currentUsers + count) <= this.maxUsers
}


export const Tenant = model<ITenant>('Tenant', tenantSchema)