'use strict'

const Project = use('App/Models/Project');
const BaseController = use('App/Controllers/Http/BaseController');

class ProjectController extends BaseController {

    index({ view }) {
        let data = {
            title: 'Project'
        };
        // return view.render('project.index', data);
    }

    async find({ params, request, response }) {
        let retVal = this.getSuccessStatus();
        let pageId = parseInt(request.input('pageId', 0));
        let pageSize = parseInt(request.input('pageSize', 30));
        if (params.id && params.id != '') {
            retVal.data = await Project.findOrFail(params.id);
        } else {
            let query = this._buildFilterData(Project.query(), request.all());
            if (pageSize > 0) {
                let recordCounts = await this._buildFilterData(Project.query(), request.all()).count("* AS recordsCount");
                if (recordCounts[0]) {
                    retVal.pagesCount = this.recordsCountToPagesCount(recordCounts[0].recordsCount, pageSize);
                }
                retVal.pageId = pageId;
                retVal.pageSize = pageSize;
                query.forPage(pageId + 1, pageSize).orderBy('id', 'desc');
            }
            retVal.data = await query.fetch();
        }
    
        return response.json(retVal);
    }

    async create({ request, response }) {
        if (request.input('name') && request.input('name') != '') {
            let project = new Project;
            let retVal = await this._buildData(project, request);
            return response.json(retVal);
        }
        return this.getDefaultStatus();
    }

    async update({ params, request, response }) {
        let project = await Project.findOrFail(params.id);
        let retVal = await this._buildData(project, request);
        return response.json(retVal);
    }

    async delete ({ params, request, response }) {
        let retVal = this.getDefaultStatus();
        let project = await Project.findOrFail(params.id);
        let status = await project.delete();
        
        if (status) {
            retVal = this.getSuccessStatus();
            retVal.data = project;
        }
        
        return response.json(retVal);
    }

    async _buildData(project, request) {
        let result = this.getDefaultStatus();
        let input = request.only(['name', 'slug', 'description']);

        if (input.name && input.name != '') {
            input.slug = this.toSlug(input.name);
            let exists = await Project.findBy('slug', input.slug);
            if (exists && exists.id) {
                result.message = 'Project exists! Please check again...';
                return result;
            }
        }
        
        project.merge(input);
        let status = await project.save();

        if (status) {
            result = this.getSuccessStatus();
            result.data = project;
        }

        return result;
    }

    _buildFilterData(query, input) {
        if (input.terms && input.terms != '') {
            query.where(function (query) {
                query.where('name', 'LIKE', `%${input.terms}%`);
                query.orWhere('description', 'LIKE', `%${input.terms}%`);
            });
        }
        return query;
    }

}

module.exports = ProjectController
