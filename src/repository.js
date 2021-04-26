const Convention = require("./convention")
const DataMapper = require("./dataMapper")
const { isEmpty } = require("./helpers/isEmpty")

const dependency = { convention: Convention }

module.exports = class Repository {
  constructor(options) {
    const di = Object.assign({}, dependency, options.injection)
    this.convention = di.convention
    this.table = options.table
    this.schema = options.schema
    this.tableQualifiedName = this.schema
      ? `${this.schema}.${this.table}`
      : `${this.table}`
    this.entity = options.entity
    this.entityIDs = options.ids
    this.foreignKeys = options.foreignKeys
    this.knex = options.knex
    this.runner = this.knex(this.tableQualifiedName)
    this.dataMapper = new DataMapper(this.entity, this.entityIDs, this.foreignKeys)
  }

  async findByID(ids) {
    const tableIDs = this.dataMapper.tableIDs()
    const tableFields = this.dataMapper.tableFields()

    const parsedValue = Array.isArray(ids) ? ids : [ids]
    const ret = await this.runner
      .select(tableFields)
      .whereIn(tableIDs[0], parsedValue)

    const entities = []

    for (const row of ret) {
      if (row === undefined) continue
      entities.push(this.dataMapper.toEntity(row))
    }

    return entities
  }

  /** 
  *
  * Find all method
  * 
  * @param {type}   object.limit Limit items to list  
  * @param {type}   object.orderBy Order by query
  * @param {type}   object.offset Rows that will be skipped from the resultset
  *
  * @return {type} List of entities
  */
  async findAll(options = {
    limit: 0,
    offset: 0,
    orderBy: null
  }) {

    const entities = this.find({ limit: options.limit, offset: options.offset, orderBy: options.orderBy })
    return entities
  }

  /** 
  *
  * Find entities
  * 
  * @param {type}   object.limit Limit items to list  
  * @param {type}   object.offset Rows that will be skipped from the resultset
  * @param {type}   object.search Where query term
  * @param {type}   object.orderBy Order by query
  *
  * @return {type} List of entities
  */
  async find(options = {
    limit: 0,
    offset: 0,
    orderBy: null,
    conditions: null
  }) {

    options.orderBy = options.orderBy || null
    options.limit = options.limit || 0
    options.offset = options.offset || 0
    options.conditions = options.conditions || null

    const tableFields = this.dataMapper.tableFields()

    let query = this.runner
      .select(tableFields)

    if (options.limit > 0) query = query.limit(options.limit)
    if (options.offset > 0) query = query.offset(options.offset)

    if (options.conditions) {
      const conditionTermTableField = this.dataMapper.toTableFieldName(Object.keys(options.conditions)[0])
      const conditionTerm = Object.keys(options.conditions)[0]
      if (!conditionTerm || conditionTerm === "0") throw "condition term is invalid"

      const conditionValue = Array.isArray(options.conditions[conditionTerm])
        ? options.conditions[conditionTerm]
        : [options.conditions[conditionTerm]]

      if (!options.conditions[conditionTerm] ||
        (typeof options.conditions[conditionTerm] === "object" && !Array.isArray(options.conditions[conditionTerm])) ||
        (Array.isArray(options.conditions[conditionTerm]) && !options.conditions[conditionTerm].length))
        throw "condition value is invalid"

      query = query.whereIn(conditionTermTableField, conditionValue)
    }

    if (options.orderBy) {
      if (!options.orderBy || typeof options.orderBy === "object" && !Array.isArray(options.orderBy) && isEmpty(options.orderBy)) throw "order by is invalid"
      query = query.orderBy(options.orderBy)
    }

    const entities = []
    const ret = await query    

    for (const row of ret) {
      if (row === undefined) continue
      entities.push(this.dataMapper.toEntity(row))
    }

    return entities
  }

  /** 
  *
  * Create a new entity
  * 
  * @param {type}   entityInstance Entity instance
  *
  * @return {type} Current entity
  */
  async insert(entityInstance) {
    const fields = this.dataMapper.tableFields()
    const payload = this.dataMapper.tableFieldsWithValue(entityInstance)

    const ret = await this.runner
      .returning(fields)
      .insert(payload)

    return this.dataMapper.toEntity(ret[0])
  }

  /** 
  *
  * Update entity
  * 
  * @param {type}   entityInstance Entity instance
  *
  * @return {type} Current entity
  */
  async update(entityInstance) {
    const tableIDs = this.dataMapper.tableIDs()
    const fields = this.dataMapper.tableFields()
    const payload = this.dataMapper.tableFieldsWithValue(entityInstance)

    const ret = await this.runner
      .where(tableIDs[0], entityInstance[tableIDs[0]])
      .returning(fields)
      .update(payload)

    return this.dataMapper.toEntity(ret[0])
  }

  /** 
  *
  * Delete entity
  * 
  * @param {type}   entityInstance Entity instance
  *
  * @return {type} True when success
  */
  async delete(entityInstance) {
    const tableIDs = this.dataMapper.tableIDs()

    const ret = await this.runner
      .where(tableIDs[0], entityInstance[tableIDs[0]])
      .delete()

    return ret === 1
  }

}
