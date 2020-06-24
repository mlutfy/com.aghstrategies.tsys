CRM.$(function ($) {

  $(document).ready(function () {
    // hide link to cancel an in progress transaction
    $("span.cancelInProgress").hide();

    // hide fields to save TSYS Responses
    $("input#tsys_initiate_response").parent().parent().hide();
    $("input#tsys_create_response").parent().parent().hide();
  });

  // Function to ensure the required fields are populated before submit
  var validateForm = function() {
    // validate form
    var allData = 1;
    $.each({
      amount: 'input#total_amount',
      device: 'select#device_id',
      fintype: 'input#financial_type_id',
      contact: 'input[name="contact_id"]',
    }, function(name, val) {
      if ($(val).val() == undefined || $(val).val() == '') {
        $(val).crmError(ts('is a required field'));
        allData = 0;
      }
    });
    return allData;
  };

  // Compile Transport URL
  var compileTransportURl = function() {
    // compile url parameters
    var $urlParams = '';

    // Is test?
    var test = 0;
    if ($('input#is_test').prop('checked')) {
      test = 1;
    }
    $urlParams = $urlParams + "&test=" + test;

    $.each({
      amount: 'input#total_amount',
      device: 'select#device_id',
      fintype: 'input#financial_type_id',
      contact: 'input[name="contact_id"]',
    }, function(name, val) {
      if ($(val).val() != undefined && $(val).val().length) {
        $urlParams = $urlParams + "&" + name + "=" + $(val).val();
      }
    });
    return CRM.vars.tsys.transport + $urlParams;
  };

  function compileCreateTransactionURL(data) {
    // Is test?
    var test = 0;
    if ($('input#is_test').prop('checked')) {
      test = 1;
    }

    // sniff https or http set up url accordingly
    if (window.location.protocol == 'https:') {
      var $create = "https://" +
      CRM.vars.tsys.ips[$('select#device_id').val()].ip
      + ":8443/v1/pos?TransportKey=" + data.TransportKey + "&Format=JSON";
      if (test == 1) {
        $create = "https://certeng-test.getsandbox.com/pos?TransportKey=" + data.TransportKey + "&Format=JSON";
      }
    }
    else {
      var $create = "http://" +
      CRM.vars.tsys.ips[$('select#device_id').val()].ip
      + ":8080/v1/pos?TransportKey=" + data.TransportKey + "&Format=JSON";
      if (test == 1) {
        $create = "http://certeng-test.getsandbox.com/pos?TransportKey=" + data.TransportKey + "&Format=JSON";
      }
    }
    return $create;
  }

  function ajaxError(xhr,status,error) {
    console.log(error);
  }

  function sendInfoToTsys(e) {
    // prevent form submit until ajax calls are done
    e.preventDefault();

    // Check that all required fields are populated
    var allData = validateForm();

    // If form is valid (all required fields are populated)
    if (allData == 1) {

      // Show cancel in progress link
      $("span.cancelInProgress").show();
      $('span.crm-button-type-cancel').hide();

      // Compile Transport URL
      var $transportUrl = compileTransportURl();

      $.ajax({
        url: $transportUrl,
        type: 'get',
      })
      .done(function(data) {

        var initiateResponse = JSON.stringify(data);
        $('input#tsys_initiate_response').val(initiateResponse);

        if (data.TransportKey.length > 0 && data.status == 'success' && CRM.vars.tsys.ips[$('select#device_id').val()].ip.length > 0) {
          $create = compileCreateTransactionURL(data);
          $.ajax({
            url: $create,
            type: 'get',
          })
          .done(function(response) {
            var createResponse = JSON.stringify(response);
            $('input#tsys_create_response').val(createResponse);
            console.log('create done')
            $('input.validate').unbind('click').click();
          })
          .fail(ajaxError)
          .always(function () {
            console.log('create always')
          });
        }
        console.log('transport done')
      })
      .fail(ajaxError)
      .always(function() {
        console.log('transport always')
        // TODO submit Form
      })
    }
  }

  $('input.validate').on('click', sendInfoToTsys);

  // If the cancel button is clicked
  $("input.cancelInProgress").click(function() {
    if (CRM.vars.tsys.ips[$('select#device_id').val()].ip.length > 0) {
      var $ip = CRM.vars.tsys.ips[$('select#device_id').val()].ip;
      var $cancelUrl = "http://" + $ip + ":8080/v1/pos?Action=Cancel&Format=JSON";

      // if https use https version of cancel url
      if (window.location.protocol == 'https:') {
        var $cancelUrl = "https://" + $ip + ":8443/v1/pos?Action=Cancel&Format=JSON";
      }
      $.ajax({
        url: $cancelUrl,
        type: 'get',
        async: false,
        success: cancelSuccess,
        error: ajaxError,
      });
    }
  });

  function cancelSuccess(data) {
    if (data.Status == "Denied") {
      CRM.alert(data.ResponseMessage + " click 'Cancel In Progress Transaction' button again", data.Status, 'info', []);
    }
    if (data.Status == "Failed") {
      CRM.alert(data.ResponseMessage, data.Status, 'error', []);
    }
  }

});
