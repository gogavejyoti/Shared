
                        <div class="col-md-3 col-sm-3">
                            <div style="display:flex">
                                <span style="margin:10px 0px 0px 10px">Department</span><span style="color:#ff3342;margin:10px 10px 0px 0px">*</span>
                                <select id="cmbDepartments"></select>
                            </div>
                        </div>

                        <div class="col-md-3 col-sm-3">
                            <div style="display:flex">
                                <span style="margin:10px 0px 0px 10px;">User</span><span style="color:#ff3342;margin:10px 10px 0px 0px">*</span>
                                <select id="cmbUsernames"></select>
                            </div>
                        </div>




            $('#cmbUsernames')[0].clearSelectedValues();
            $('#cmbDepartments')[0].clearSelectedValues();
    $('#cmbDepartments').multiSelectDropdown({
        placeholder: 'Select',
        tooltip: true,
        sortLabel: true,
        data: [],
        onHide: function () {
            var selectionChanged = $('#cmbDepartments')[0].hasSelectionChanged();
            if (selectionChanged) {
                filterUsernameByCriteria($('#cmbUsernames')[0], getSelectedDepartmentIdsByCriteria());
            }
        },
    })

function filterUserDepartments() {
    var url = '/filter/userdepatments';
    $.ajax({
        url: url,
        method: 'GET',
        'dataType': 'json',
        cache: false,
        'contentType': 'application/json',
        success: function (response) {
            // Assuming the response is an array of objects with 'value' and 'text' properties
            var filterUserdepatment = $('#filterUserdepatment');
            filterUserdepatment.empty();
            filterUserdepatment.append('<option value="0">All</option>');
            $.each(response.data, function (index, item) {
                filterUserdepatment.append('<option value="' + item.id + '">' + item.displayName + '</option>');
            });
        },
        error: function (error) {
            console.error('Error fetching data:', error);
        }
    });
}


var getSelectedDepartmentIdsByCriteria = function () {
    var departmentIds = $('#cmbDepartments')[0].getSelectedValues();
    if (departmentIds.length > 0 && departmentIds[0] == '0')
        return [];
    return departmentIds;
};