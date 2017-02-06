(function () {
  'use strict';

  angular.module('c8y.core')
    .factory('c8yTenant', c8yTenant);

  function c8yTenant (
    $http,
    $location,
    $q,
    $window,
    $interval,
    c8yBase,
    c8yUser
  ) {
    var BASE_PATH = 'tenant/tenants';
    var TOP_TENANT_NAME = 'management';
    var PAGE_SIZE = 1000;
    var KEYS_TO_REMOVE_IF_NOT_NEW = [
      'applications',
      'ownedApplications',
      'adminName'
    ];
    var KEYS_TO_REMOVE_IF_NEW = [
      'allowCreateTenants'
    ];
    var KEYS_TO_REMOVE_IF_NOT_ADMIN_PASS = [
      'adminPass'
    ];
    var clean = c8yBase.cleanFields;

    function list(filters) {
      var _filters = c8yBase.pageSizeFilter({pageSize: PAGE_SIZE}),
        cfg = {
          params: _filters
        },
        path = BASE_PATH,
        url = c8yBase.url(path),
        onList = c8yBase.cleanListCallback('tenants', list, _filters);
      return $http.get(url, cfg).then(onList);
    }

    function detail(tenant) {
      var url = buildDetailUrl(tenant);
      return $http.get(url);
    }

    function buildDetailUrl(tenant) {
      var id = tenant.id || tenant;
      return c8yBase.url(BASE_PATH + '/' + id);
    }

    function buildDetailApplicationsUrl(tenant) {
      return buildDetailUrl(tenant) + '/applications';
    }

    function save(tenant) {
      tenant = _.cloneDeep(tenant);

      var isNew = !tenant.applications,
        method = isNew ? 'post' : 'put';
      var allowCreateTenants = tenant.allowCreateTenants;

      if (!tenant.adminPass) {
        tenant = clean(tenant, KEYS_TO_REMOVE_IF_NOT_ADMIN_PASS);
      }

      tenant = isNew ?
        clean(tenant, KEYS_TO_REMOVE_IF_NEW) :
        clean(tenant, KEYS_TO_REMOVE_IF_NOT_NEW);

      var url = c8yBase.url(BASE_PATH) + (!isNew ? '/' + tenant.id : ''),
        data = tenant,
        cfg = {headers: c8yBase.contentHeaders('tenant', true)};
      return $http[method](url, data, cfg)
        .then(function (response) {
          if (isNew && allowCreateTenants) {
            return saveTenantAllowOption(response, url, cfg, allowCreateTenants);
          } else {
            return $q.when();
          }
        });
    }

    function saveTenantAllowOption (response, url, cfg, allowCreateTenants) {
      var tenantId = response.data.id;
      url += '/' + tenantId;
      return $http.put(url, { allowCreateTenants: allowCreateTenants }, cfg);
    }

    function remove(tenant) {
      var url = buildDetailUrl(tenant);
      return $http.delete(url);
    }

    function addApplication(tenant, application) {
      var applicationId = application.id || application,
        url = buildDetailApplicationsUrl(tenant),
        data = {application: {id: applicationId, self: application.self}},
        cfg = {headers: c8yBase.contentHeaders('applicationReference', true)};
      return $http.post(url, data, cfg);
    }

    function removeApplication(tenant, application) {
      var applicationId = application.id || application,
        url = buildDetailApplicationsUrl(tenant) + '/' + applicationId;
      return $http.delete(url);
    }

    function isCurrentUserTopTenant () {
      return c8yUser.current().then(function(res) {
        return res.tenant === TOP_TENANT_NAME;
      });
    }

    function isParentTopTenant(tenant) {
      return tenant.parent === TOP_TENANT_NAME;
    }

    return {
      list: list,
      save: save,
      remove: remove,
      detail: detail,
      addApplication: addApplication,
      removeApplication: removeApplication,
      isCurrentUserTopTenant: isCurrentUserTopTenant,
      isParentTopTenant: isParentTopTenant
    };
  }
}());
