#pragma once

#include <Arduino.h>
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"

enum class JobStatus : uint8_t {
  IDLE,
  QUEUED,
  STARTED,
  FINISHED,
  ERROR
};

struct Job {
  char       id[64];
  JobStatus  status;
  char       errorMessage[128];
  TickType_t startedAt;
};

namespace JobManager {
  void      init();

  void      setStatus(JobStatus status, const char* errorMessage = nullptr);
  JobStatus getStatus();

  void      setStarted(const char* jobId);
  void      setQueued (const char* jobId);
  void      setFinished();
  void      setError  (const char* errorMessage);

  bool      isIdle();
  bool      isBusyWith(const char* jobId);

  void      getSnapshot(Job& out);

  const char* statusToString(JobStatus status);
}
