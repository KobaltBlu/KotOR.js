class NotificationManager {

  constructor(){
    NotificationManager.$notifyHolder = $('<div class="notify-holder" />');
    $('body').append(NotificationManager.$notifyHolder);

    NotificationManager.Types = {
      ALERT: -1,
      INFO: 0,
      SUCCESS: 1,
      WARNING: 2
    }

  }

  static Init(){

  }


  static Notify(type = NotificationManager.Types.INFO, msg = ''){

    let $notification;

    switch(type){
      case NotificationManager.Types.ALERT:
        $notification =  $('<div class="alert alert-danger alert-dismissible" role="alert" />');
      break;
      case NotificationManager.Types.SUCCESS:
        $notification =  $('<div class="alert alert-success alert-dismissible" role="alert" />');
      break;
      case NotificationManager.Types.WARNING:
        $notification =  $('<div class="alert alert-warning alert-dismissible" role="alert" />');
      break;
      default:
        $notification =  $('<div class="alert alert-info alert-dismissible" role="alert" />');
      break;
    }

    $notification.append('<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>')
    .append('<span id="alert-msg">'+msg+'</span>').hide();

    NotificationManager.$notifyHolder.append($notification.fadeIn('slow'));

    let timeout = () => {
      $notification.fadeOut('fast', () => {
        $notification.remove();
      })
    };

    let timeoutId = setTimeout(timeout, 2500);
    $notification.data('timeout', timeoutId);

    $notification.mouseenter(function(){
      clearTimeout($notification.data('timeout'));
    }).mouseleave(() => {
        timeoutId = setTimeout(timeout, 1000);
        //set the timeoutId, allowing us to clear this trigger if the mouse comes back over
        $notification.data('timeout', timeoutId);
    });

  }


}

module.exports = NotificationManager;
