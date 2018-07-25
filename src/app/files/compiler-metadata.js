'use strict'
var executionContext = require('../../execution-context')

class CompilerMetadata {
  constructor (events, opts) {
    var self = this
    self._events = events
    self._opts = opts
  }

  syncContractMetadata () {
    var self = this
    self._events.compiler.register('compilationFinished', (success, data, source) => {
      if (success) {
        executionContext.detectNetwork((err, { id, name } = {}) => {
          if (err) {
            console.log(err)
          } else {
            self._syncContractMetadata(name + '_' + id)
          }
        })
      }
    })
  }

  _syncContractMetadata (networkid) {
    var self = this
    var provider = self._opts.fileManager.currentFileProvider()
    var path = self._opts.fileManager.currentPath()
    if (provider && path) {
      self._opts.compiler.visitContracts((contract) => {
        var fileName = path + '/' + contract.name + '_' + networkid + '.json'
        provider.get(fileName, (error, content) => {
          if (!error) {
            content = content || '{}'
            var metadata
            try {
              metadata = JSON.parse(content)
            } catch (e) {
              console.log(e)
            }
            var linkReferences = metadata['linkReferences']
            var autoDeployLib = metadata['autoDeployLib']
            if (!linkReferences) linkReferences = {}
            if (autoDeployLib === undefined) autoDeployLib = true
            for (var libFile in contract.object.evm.bytecode.linkReferences) {
              if (!linkReferences[libFile]) linkReferences[libFile] = {}
              for (var lib in contract.object.evm.bytecode.linkReferences[libFile]) {
                if (!linkReferences[libFile][lib]) {
                  linkReferences[libFile][lib] = '<address>'
                }
              }
            }
            metadata['linkReferences'] = linkReferences
            metadata['autoDeployLib'] = autoDeployLib
            provider.set(fileName, JSON.stringify(metadata, null, '\t'))
          }
        })
      })
    }
  }

  metadataOf (contractName, callback) {
    var self = this
    var provider = self._opts.fileManager.currentFileProvider()
    var path = self._opts.fileManager.currentPath()
    if (provider && path) {
      executionContext.detectNetwork((err, { id, name } = {}) => {
        if (err) {
          console.log(err)
        } else {
          var networkId = name + '_' + id
          var fileName = path + '/' + contractName + '_' + networkId + '.json'
          provider.get(fileName, (error, content) => {
            if (error) return callback(error)
            try {
              callback(null, JSON.parse(content))
            } catch (e) {
              callback(e.message)
            }
          })
        }
      })
    }
  }
}

module.exports = CompilerMetadata
