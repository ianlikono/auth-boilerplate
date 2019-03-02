import { Field, ID, ObjectType } from "type-graphql";
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@ObjectType()
@Entity()
export class User extends BaseEntity {
    @Field(() => ID)
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Field()
    @Column()
    username: string;

    @Field()
    @Column("text", { unique: true })
    email: string;

    @Column({ type: "text", unique: true })
    sub: string;

    @Field()
    @Column({ type: "text" })
    pictureUrl: string;

    @Column('bool', { default: false })
    email_verified: boolean;
}
