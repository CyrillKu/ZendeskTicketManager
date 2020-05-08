async function applyChangesToTicket() {
    var url = RmApp.settings.serverUrl + '/api/v2/tickets/update_many.json?ids=' + await getValueFromAPI('ticket.id');
    var body = RmApp.updateBody;
    var fetchSelf = makeFetchBody(url, 'PUT', JSON.stringify(body), RmApp.settings.tokenZen);
    return client.request(fetchSelf);
}

// добавляем ссылку на рекламацию в форму RecMan (нужен рефакторинг!!!)
async function getLinksFromComment() {
    var reclamations = await getValueFromField(RmApp.settings.reclamationsFieldId);
    var tasks = await getValueFromField(RmApp.settings.featuresFieldId);
    var comment = await getValueFromAPI('ticket.comment');
    var links = getLinksFromString(comment.text);
    //фильтруем все извлеченные из комментария ссылки по ключам 'reclamation' и '/rm/'
    if (links.length > 0) links.forEach(async link => {
        if (!link.href.includes('List')) {
            var number = getNumberFromUrl(link);
            if (number.match(/^\d+$/) && !RmApp.numbers.includes(number)) {
                RmApp.numbers.push(number);
                if ((link.href.includes('/reclamation') || link.href.includes('/rm/'))) {
                    if (reclamations && !reclamations.includes(number)) {
                        reclamations += number + ',';
                        addLinkField(number, '');
                    } else if (!reclamations) {
                        reclamations = number + ',';
                        addLinkField(number, '');
                    }
                    addTag('reclamation');
                    addTag('rm' + number);
                    updateField(RmApp.settings.reclamationsFieldId, reclamations);
                }
                if (link.href.includes('tfs')) {
                    if (tasks && tasks.indexOf(number) < 0) {
                        tasks += number + ',';
                        if (link.href.includes('tfs/HQ') || link.href.includes('tfs.abbyy.com/HQ')) {
                            addLinkField('', number, "HQ");
                            addTag('tfs' + number + 'h');
                        }
                        if (link.href.includes('tfs/SDK') || link.href.includes('tfs.abbyy.com/SDK')) {
                            addLinkField('', number, "SDK");
                            addTag('tfs' + number + 's');
                        }
                        if (link.href.includes('tfs/Cloud') || link.href.includes('tfs.abbyy.com/Cloud')) {
                            addLinkField('', number, "Cloud");
                            addTag('tfs' + number + 'c');
                        }
                    } else if (!tasks) {
                        tasks = number + ',';
                        if (link.href.includes('tfs/HQ') || link.href.includes('tfs.abbyy.com/HQ')) {
                            addLinkField('', number, "HQ");
                            addTag('tfs' + number + 'h');
                        }
                        if (link.href.includes('tfs/SDK') || link.href.includes('tfs.abbyy.com/SDK')) {
                            addLinkField('', number, "SDK");
                            addTag('tfs' + number + 's');
                        }
                        if (link.href.includes('tfs/Cloud') || link.href.includes('tfs.abbyy.com/Cloud')) {
                            addLinkField('', number, "Cloud");
                            addTag('tfs' + number + 'c');
                        }
                    }
                    addTag('tfs')
                    updateField(RmApp.settings.featuresFieldId, tasks);
                }
            }
        }
    });
}
//инициализировать процедуру создания дочернего тикета
// async function createLinkedTicket(data) {
//     // var button = document.querySelector('span[data-linkedCreate]');
//     // button.classList.add('hidden');
//     var createUrl = RmApp.settings.serverUrl + 'api/v2/tickets.json';
//     var currentTicket = await getValueFromAPI('ticket');
//     var createQuery = await createLinkedTicketQuery(currentTicket, data);
//     var createFetch = makeFetchBody(createUrl, 'POST', createQuery, null);
//     var createResponse = await client.request(createFetch);
//     var updateUrl = RmApp.settings.serverUrl + 'api/v2/tickets/' +
//         currentTicket.id + '.json';
//     var sourceQuery = {
//         ticket: {
//             custom_fields: [{
//                 id: RmApp.settings.linkedDataFieldId,
//                 value: "parent_of:" + createResponse.ticket.id
//             }]
//         }
//     }
//     var updateQuery = JSON.stringify(sourceQuery);
//     var updateFetch = makeFetchBody(updateUrl, 'PUT', updateQuery, null);
//     await client.request(updateFetch);
//     await addLinkedTicketToList(createResponse.ticket.id, true);
// }
// прокинуть список рекламаций и тэги в Parent Ticket ( на 1 линию), а также оставить сообщение 1 линии об обновлении запроса на 2 линии
// async function transferReclamationsToLinkedTicket(reclamationsFromField) {
//     var parentReclamationArray = [];
//     var childReclamationArray = [];
//     var parentReclamations = null;
//     var isParent = null;
//     var linkedTicketId = null;
//     var linkedData = await getValueFromField(RmApp.settings.linkedDataFieldId);
//     if (linkedData) {
//         isParent = (linkedData.indexOf('child') < 0);
//         if (isParent) {
//             var status = await getValueFromAPI('ticket.status');
//             var linkedData = await getValueFromField(RmApp.settings.linkedDataFieldId);
//             if (status == 'solved') {
//                 linkedTicketId = linkedData.substring(linkedData.indexOf(':') + 1,
//                     linkedData.length);
//                 var url = RmApp.settings.serverUrl + 'api/v2/tickets/' + linkedTicketId +
//                     '.json';
//                 var sourceQuery = {
//                     ticket: {
//                         comment: {
//                             public: false,
//                             body: "Parent ticket has been Solved."
//                         }
//                     }
//                 }
//                 var linkedTicket = await getLinkedTicketData(linkedTicketId);
//                 if (linkedTicket.status !== 'closed') {
//                     var query = JSON.stringify(sourceQuery);
//                     var ticketFetch = makeFetchBody(url, 'PUT', query, null);
//                     await client.request(ticketFetch);
//                 }
//             }
//             return;
//         } else {
//             linkedTicketId = linkedData.substring(linkedData.indexOf(':') + 1,
//                 linkedData.length);
//             var linkedTicket = await getLinkedTicketData(linkedTicketId);
//             if (linkedTicket.status === 'closed') {
//                 linkedTicketId = linkedTicket.followup_ids[linkedTicket.followup_ids
//                     .length - 1];
//                 if (linkedTicketId !== undefined) {
//                     client.set('ticket.customField:custom_field_' + RmApp.settings
//                         .linkedDataFieldId,
//                         "child_of:" + linkedTicketId);
//                     linkedTicket = await getLinkedTicketData(linkedTicketId);
//                 }

//             }
//             if (linkedTicket.status !== 'closed') {
//                 if (linkedTicket.custom_fields.find(item => item.id == RmApp.settings
//                         .reclamationsFieldId).value !== null) {
//                     parentReclamations = linkedTicket.custom_fields.find(item =>
//                         item.id == RmApp.settings.reclamationsFieldId).value;
//                 }

//                 if (reclamationsFromField !== null) {
//                     childReclamationArray = reclamationsFromField.slice(0, -1).split(',');
//                 }
//                 if (parentReclamations !== null) {
//                     parentReclamationArray = parentReclamations.slice(0, -1).split(',');
//                 }
//                 var resultSet = [...new Set([...parentReclamationArray, ...
//                     childReclamationArray
//                 ])];
//                 resultSet = resultSet.filter(reclamation => reclamation.length > 5);
//                 var url = RmApp.settings.serverUrl + 'api/v2/tickets/' + linkedTicketId +
//                     '.json';
//                 var tagsUrl = RmApp.settings.serverUrl + 'api/v2/tickets/' +
//                     linkedTicketId +
//                     '/tags.json';
//                 var ticketFetch = makeFetchBody(url, 'PUT', createTicketQuery(resultSet,
//                     RmApp
//                     .settings
//                     .reclamationsFieldId, linkedTicket.status), null);
//                 await client.request(ticketFetch);
//                 if (resultSet.length > 0) {
//                     var tagsFetch = makeFetchBody(tagsUrl, 'PUT', createTagsQuery(
//                         resultSet), null);
//                     try {
//                         await client.request(tagsFetch);
//                     } catch (error) {
//                         console.log(error);
//                     }

//                 }
//             }
//         }
//     } else return true;
// }
//заполнить запрос на создание Linked Ticekt информацией из полей тикета
// async function createLinkedTicketQuery(currentTicket, data) {
//     var currentUser = await client.get('currentUser');
//     var query = {
//         ticket: {
//             subject: ((currentTicket.organization == undefined) ? "[Organization]" :
//                 currentTicket.organization.name) + ' - ' + (await getValueFromField(RmApp.settings
//                 .productVersionFieldId)) + ' - ' + data.subject,
//             comment: {
//                 body: "*",
//                 public: false
//             },
//             status: "new",
//             priority: currentTicket.priority,
//             requester_id: (Object.keys(currentTicket.assignee).length === 0) ? currentUser
//                 .currentUser.id : currentTicket.assignee.user.id,
//             assignee_id: (Object.keys(currentTicket.assignee).length === 0) ? currentUser
//                 .currentUser
//                 .id : currentTicket.assignee.user.id,
//             group_id: (Object.keys(currentTicket.assignee).length === 0) ? currentUser
//                 .currentUser
//                 .groups[0].id : currentTicket.assignee.group.id,
//             ticket_form_id: currentTicket.form.id,
//             tags: currentTicket.tags,
//             custom_fields: [{
//                     id: RmApp.settings.reclamationsFieldId,
//                     value: await getValueFromField(RmApp.settings.reclamationsFieldId)
//                 },
//                 {
//                     id: RmApp.settings.buildFieldId,
//                     value: await getValueFromField(RmApp.settings.buildFieldId)
//                 },
//                 {
//                     id: RmApp.settings.serialFieldId,
//                     value: await getValueFromField(RmApp.settings.serialFieldId)
//                 },
//                 {
//                     id: RmApp.settings.linkedDataFieldId,
//                     value: "child_of:" + currentTicket.id
//                 },
//             ],
//         }
//     }
//     return JSON.stringify(query);
// }
//заполнить запрос на комментарий в Parent Ticket
// function createTicketQuery(resultSet, fieldId, status) {
//     var source = {
//         ticket: {
//             comment: {
//                 public: false,
//                 body: "Child ticket has been updated. This ticket previous status was: " +
//                     status
//                     .toUpperCase()
//             },
//             custom_fields: {
//                 id: fieldId,
//                 value: [...resultSet].join(',') + ','
//             }
//         }
//     }
//     if (status == 'solved') {
//         delete source.ticket.comment;
//     }
//     return JSON.stringify(source);
// }
//заполнить запрос на теги в Parent Ticket
// function createTagsQuery(resultSet) {
//     var source = {
//         tags: ["reclamation"]
//     }
//     resultSet.forEach(function (reclamation) {
//         if (reclamation !== '') {
//             source.tags.push('rm' + reclamation);
//         }
//     });
//     return JSON.stringify(source);
// }

async function updateFollowUps() {
    var currentTicketId = await getValueFromAPI('ticket.id');
    var linkedData = await getValueFromField(RmApp.settings.linkedDataFieldId);
    if (linkedData) {
        var linkedTicket = await getLinkedTicketData(linkedData.substring(linkedData.indexOf(":") + 1,
            linkedData.length));
        if (linkedTicket) {
            if (linkedTicket.status == 'closed') {
                var followUpId = linkedTicket.followup_ids[linkedTicket.followup_ids
                    .length - 1];
                if (followUpId) {
                    var url = RmApp.settings.serverUrl + 'api/v2/tickets/' + currentTicketId + '.json';
                    var sourceQuery = {
                        ticket: {
                            custom_fields: [{
                                id: RmApp.settings.linkedDataFieldId,
                                value: linkedData.substring(0, linkedData.indexOf(":") + 1) +
                                    followUpId
                            }]
                        }
                    }
                    var query = JSON.stringify(sourceQuery);
                    var fetch = makeFetchBody(url, 'PUT', query, null);
                    await client.request(fetch);
                }
            }

        }
    }
}

async function deleteLinkedData() {
    updateField(RmApp.settings.linkedDataFieldId, "");
}

async function showWarnings() {
    var tags = await getValueFromAPI('ticket.tags');
    var priority = await getValueFromAPI('ticket.priority');
    tags.forEach(tag => {
        if (tag.indexOf('smua') > -1) {
            addWarning("smua", 1, capitalize(tag.substring(tag.indexOf('_') + 1, tag.length)));
        }
        if (tag.indexOf("vip_client") > -1) {
            addWarning("vip", 1, 'VIP');
        };
        if (tag.includes('severity1_critical') || tag.includes('severity2_major') || tag.includes('severity3_normal') || tag.includes('severity4_low')) {
            addWarning("severity", 2, capitalize(tag.substring(tag.indexOf('_') + 1, tag.length)));
        }
        // if (tag.indexOf("premium_solution_support") > -1) {
        //     addWarning("ps", 1);
        //     isAdded = true;
        // };

        if (tag.includes('priority_raised')) {
            document.querySelector('i[data-raised]').classList.remove('hidden')
        }

        if (tag.includes('escalation_open') || tag.includes('escalation_closed')) {
            addWarning("escalation", 3, capitalize(tag.substring(tag.indexOf('_') + 1, tag.length)));
        }
    });
    if (priority && priority != '-') {
        addWarning("priority", 2, capitalize(priority));
    }
}

async function launchModal(url, size = {}) {
    await client.invoke('instances.create', {
        location: 'modal',
        url: url,
        size: size,
    });
}
//добавить тег
async function addTag(value) {
    RmApp.updateBody.ticket.additional_tags.push(value);
}
// удалить тег
async function removeTag(value) {
    RmApp.updateBody.ticket.remove_tags.push(value);
    console.log(RmApp.updateBody.ticket);
}

async function processEscalation(message) {
    var tags = await getValueFromAPI('currentUser.tags');
    var url = RmApp.settings.serverUrl + "/api/v2/tickets/" + await getValueFromAPI(
        'ticket.id') + "/side_conversations.json";
    var fetchSelf = makeFetchBody(url, 'GET', '', RmApp.settings.tokenZen);
    var response = await client.request(fetchSelf);
    response.side_conversations.forEach(async function (conf) {
        if (tags.includes("product_level_3") && (conf.subject.indexOf(
                    "Level 3") > -
                1)) {
            await replyToConf(conf.id, conf.participants, message);

        } else if (tags.includes("product_level_2") && (conf.subject.indexOf(
                    "Level 2") > -
                1)) {
            await replyToConf(conf.id, conf.participants, message);

        } else if (tags.includes("product_level_1") && (conf.subject.indexOf(
                    "Level 1") > -
                1)) {
            await replyToConf(conf.id, conf.participants, message);
        }
    });
}

async function replyToConf(id, participants, message) {
    var url = RmApp.settings.serverUrl + "/api/v2/tickets/" + await getValueFromAPI('ticket.id') +
        "/side_conversations/" + id + "/reply.json";
    var message = {
        message: {
            from: await getValueFromAPI('currentUser.email'),
            html_body: message,
            to: participants
        }
    }
    var query = JSON.stringify(message);
    var fetch = makeFetchBody(url, "POST", query, RmApp.settings.tokenZen);
    client.request(fetch);
}

async function updateField(fieldId, value) {
    RmApp.updateBody.ticket.custom_fields.push({
        id: fieldId,
        value: value
    })
}
/////////////////////////////////////////////Utility functions///////////////////////////////////////////
// собрать тело http-запроса
function makeFetchBody(url, type, query, auth) {
    if (auth) {
        var headers = {
            "Authorization": 'Bearer ' + auth
        }
        if (auth.includes("Basic")) headers = {
            "Authorization": auth
        };
    } else headers = " ";
    return {
        url: url,
        headers: headers,
        contentType: 'application/json',
        secureProtocol: 'TLSv1_2_method',
        type: type,
        data: query,
        cors: true

    };
}

async function getLinkedTicketData(linkedTicketId) {
    if (linkedTicketId) {
        var url = RmApp.settings.serverUrl + 'api/v2/tickets/' + linkedTicketId + '.json';
        var fetchSelf = makeFetchBody(url, 'GET', '', null);
        try {
            var response = await client.request(fetchSelf);
        } catch (error) {
            if (error.status == 404) return undefined;
        } finally {
            if (response) return response.ticket;
        }
    } else return undefined;
}

async function getValueFromField(fieldId, parentClient = null) {
    if (parentClient) client = parentClient;
    var fieldData = await client.get('ticket.customField:custom_field_' + fieldId);
    var value = fieldData['ticket.customField:custom_field_' + fieldId];
    return value;
}

async function getValueFromAPI(method) {
    var data = await client.get(method);
    var value = data[method];
    return value;
}

function getNumberFromUrl(link) {
    return link.href.substring(link.href.lastIndexOf('/') + 1, link.href.length)
}

async function getAppClients(client) {
    var instances = (await client.get('instances')).instances;
    var parentClient = null;
    var modalClient = null;
    for (var instanceGuid in instances) {
        if (instances[instanceGuid].location === 'ticket_sidebar') {
            parentClient = client.instance(instanceGuid);
        }
        if (instances[instanceGuid].location === 'modal') {
            modalClient = client.instance(instanceGuid);
        }
    }
    return {
        modalClient: modalClient,
        parentClient: parentClient
    }

}

function openTicket(link) {
    client.invoke('routeTo', 'ticket', link.innerHTML);
}
//открыть справку "О программе"
function openAboutPage() {
    window.open('https://wiki.abbyy.com/display/SP/Integration+with+Reclamation+Manager');
}
//создать новую рекламацию ( обрбаботка нажатия на "+")
async function createNewReclamation() {
    var tags = await getValueFromAPI('ticket.tags');
    var requestNumber = await getValueFromAPI('ticket.id');
    if (tags.indexOf('abbyy_3a') >= 0) window.open(
        'https://reclamationmanager.abbyy.com/NewReclamation.aspx?description=%5burl%3dhttps%3a%2f%2fabbyy.zendesk.com%2fagent%2ftickets%2f' +
        requestNumber + '%5dZendesk+request+%23' + requestNumber +
        '%5b%2furl%5d&tags=helpdesk,abbyy_3a'
    );
    else window.open(
        'https://reclamationmanager.abbyy.com/NewReclamation.aspx?description=%5burl%3dhttps%3a%2f%2fabbyy.zendesk.com%2fagent%2ftickets%2f' +
        requestNumber + '%5dZendesk+request+%23' + requestNumber +
        '%5b%2furl%5d&tags=helpdesk'
    );
    addTag("waiting_for_fix");
}

function capitalize(str) {
    if (!str) return str;
    return str[0].toUpperCase() + str.slice(1);
}

function getLinksFromString(str) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(str, "text/html");
    return Array.from(doc.links);
}

function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}