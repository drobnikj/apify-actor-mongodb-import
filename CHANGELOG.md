# Changelog

## 1.0.x [v1] (2023-11-02)

* BREAKING CHANGE: Introduce Input schema with update options. The new version is not compatible with the old one.
If you want to use the old input, please use the `0.0.x` version with `latest` tag.
The new version is focus on importing data from dataset, so the `datasetId` is required.
If you want to do some transformation of data before import, please use some actor before this actor, which can handle this.
* Added datasetId option to import data from dataset.

## 0.0.x [latest] (2023-11-02)

* Old version do not have changelog

