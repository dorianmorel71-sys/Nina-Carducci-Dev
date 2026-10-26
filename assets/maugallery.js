(function($) {
  $.fn.mauGallery = function(options) {
    var options = $.extend($.fn.mauGallery.defaults, options);

    // PERFO : Évite de dupliquer les écouteurs d'événements si la galerie est appelée plusieurs fois
    if (!$.fn.mauGallery.isInitialized) {
      $.fn.mauGallery.listeners(options);
      $.fn.mauGallery.isInitialized = true;
    }

    return this.each(function() {
      var $gallery = $(this);
      var tagsCollection = [];

      $.fn.mauGallery.methods.createRowWrapper($gallery);

      if (options.lightBox) {
        $.fn.mauGallery.methods.createLightBox(
            $gallery,
            options.lightboxId,
            options.navigation
        );
      }

      $gallery.children(".gallery-item").each(function() {
        var $item = $(this);
        $.fn.mauGallery.methods.responsiveImageItem($item);

        // PERFO : Utilisation du contexte local ($gallery) au lieu de sélecteurs globaux
        $.fn.mauGallery.methods.moveItemInRowWrapper($item, $gallery);
        $.fn.mauGallery.methods.wrapItemInColumn($item, options.columns);

        var theTag = $item.data("gallery-tag");
        if (
            options.showTags &&
            theTag !== undefined &&
            tagsCollection.indexOf(theTag) === -1
        ) {
          tagsCollection.push(theTag);
        }
      });

      if (options.showTags) {
        $.fn.mauGallery.methods.showItemTags(
            $gallery,
            options.tagsPosition,
            tagsCollection
        );
      }

      // PERFO : Durée d'animation unifiée à 300ms pour plus de fluidité
      $gallery.fadeIn(300);
    });
  };

  $.fn.mauGallery.defaults = {
    columns: 3,
    lightBox: true,
    lightboxId: null,
    showTags: true,
    tagsPosition: "bottom",
    navigation: true
  };

  $.fn.mauGallery.listeners = function(options) {
    $(document).on("click", ".gallery-item", function() {
      if (options.lightBox && $(this).prop("tagName") === "IMG") {
        $.fn.mauGallery.methods.openLightBox($(this), options.lightboxId);
      }
    });

    $(document).on("click", ".gallery .nav-link", $.fn.mauGallery.methods.filterByTag);

    // PERFO : Remplacement par une fonction mutualisée "changeImage" avec direction (-1 ou 1)
    $(document).on("click", ".mg-prev", () =>
        $.fn.mauGallery.methods.changeImage(options.lightboxId, -1)
    );
    $(document).on("click", ".mg-next", () =>
        $.fn.mauGallery.methods.changeImage(options.lightboxId, 1)
    );
  };

  $.fn.mauGallery.methods = {
    createRowWrapper(element) {
      if (!element.children().first().hasClass("row")) {
        element.append('<div class="gallery-items-row row"></div>');
      }
    },

    wrapItemInColumn(element, columns) {
      if (typeof columns === "number") {
        element.wrap(
            `<div class='item-column mb-4 col-${Math.ceil(12 / columns)}'></div>`
        );
      } else if (typeof columns === "object") {
        var columnClasses = "";
        // PERFO : Utilisation d'une boucle pour générer dynamiquement les classes Bootstrap
        ["xs", "sm", "md", "lg", "xl"].forEach(size => {
          if (columns[size]) {
            var prefix = size === "xs" ? "col-" : `col-${size}-`;
            columnClasses += ` ${prefix}${Math.ceil(12 / columns[size])}`;
          }
        });
        element.wrap(`<div class='item-column mb-4${columnClasses}'></div>`);
      } else {
        console.error(`Columns should be defined as numbers or objects. ${typeof columns} is not supported.`);
      }
    },

    // PERFO : Passage explicite de la galerie en paramètre
    moveItemInRowWrapper(element, gallery) {
      element.appendTo(gallery.find(".gallery-items-row"));
    },

    responsiveImageItem(element) {
      if (element.prop("tagName") === "IMG") {
        element.addClass("img-fluid");
      }
    },

    openLightBox(element, lightboxId) {
      const modalId = lightboxId ? lightboxId : "galleryLightbox";
      $(`#${modalId}`)
          .find(".lightboxImage")
          .attr("src", element.attr("src"));
      $(`#${modalId}`).modal("toggle");
    },

    // PERFO : Récupération uniquement des images visibles (filtrées)
    getFilteredImages() {
      let imagesCollection = [];
      $(".item-column:visible").each(function() {
        let $img = $(this).children("img.gallery-item");
        if ($img.length) {
          imagesCollection.push($img);
        }
      });
      return imagesCollection;
    },

    // PERFO : Fusion intelligente avec boucle circulaire
    changeImage(lightboxId, direction) {
      const modalId = lightboxId ? lightboxId : "galleryLightbox";
      let $modal = $(`#${modalId}`);
      let activeSrc = $modal.find(".lightboxImage").attr("src");
      let imagesCollection = $.fn.mauGallery.methods.getFilteredImages();
      let currentIndex = -1;

      imagesCollection.forEach((img, index) => {
        if (img.attr("src") === activeSrc) {
          currentIndex = index;
        }
      });

      if (currentIndex !== -1) {
        let newIndex = currentIndex + direction;
        if (newIndex < 0) {
          newIndex = imagesCollection.length - 1;
        } else if (newIndex >= imagesCollection.length) {
          newIndex = 0;
        }
        $modal.find(".lightboxImage").attr("src", imagesCollection[newIndex].attr("src"));
      }
    },

    createLightBox(gallery, lightboxId, navigation) {
      const modalId = lightboxId ? lightboxId : "galleryLightbox";
      if ($(`#${modalId}`).length === 0) {
        gallery.append(`<div class="modal fade" id="${modalId}" tabindex="-1" role="dialog" aria-hidden="true">
                <div class="modal-dialog" role="document">
                    <div class="modal-content">
                        <div class="modal-body">
                            ${
            navigation
                ? '<div class="mg-prev" style="cursor:pointer;position:absolute;top:50%;left:-15px;background:white;z-index:10;padding:5px 10px;user-select:none;"><</div>'
                : '<span style="display:none;" />'
        }
                            <img class="lightboxImage img-fluid" alt="Image affichée dans la visionneuse de la galerie"/>
                            ${
            navigation
                ? '<div class="mg-next" style="cursor:pointer;position:absolute;top:50%;right:-15px;background:white;z-index:10;padding:5px 10px;user-select:none;">></div>'
                : '<span style="display:none;" />'
        }
                        </div>
                    </div>
                </div>
            </div>`);
      }
    },

    showItemTags(gallery, position, tags) {
      var tagItems =
          '<li class="nav-item"><span class="nav-link active active-tag" data-images-toggle="all">Tous</span></li>';
      $.each(tags, function(index, value) {
        tagItems += `<li class="nav-item">
                <span class="nav-link" data-images-toggle="${value}">${value}</span></li>`;
      });
      var tagsRow = `<ul class="my-4 tags-bar nav nav-pills">${tagItems}</ul>`;

      if (position === "bottom") {
        gallery.append(tagsRow);
      } else if (position === "top") {
        gallery.prepend(tagsRow);
      } else {
        console.error(`Unknown tags position: ${position}`);
      }
    },

    // PERFO : Logique de filtrage par tags optimisée
    filterByTag() {
      var $this = $(this);
      if ($this.hasClass("active-tag")) {
        return;
      }

      var $gallery = $this.closest(".gallery");
      $gallery.find(".active-tag").removeClass("active active-tag");
      $this.addClass("active-tag");

      var tag = $this.data("images-toggle");
      var $columns = $gallery.find(".item-column");

      if (tag === "all") {
        $columns.show(200);
      } else {
        $columns.hide();
        $columns.filter(function() {
          return $(this).find(".gallery-item").data("gallery-tag") === tag;
        }).show(200);
      }
    }
  };
})(jQuery);